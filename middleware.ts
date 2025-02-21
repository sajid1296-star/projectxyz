import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { withAuth } from 'next-auth/middleware';
import { checkRedirect } from './lib/seo';
import { CacheManager } from './lib/cache';
import { match } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';
import { prisma } from '@/lib/prisma';
import { SEOService } from '@/lib/seo';
import { MonitoringService } from '@/lib/monitoring';
import { headers } from 'next/headers';
import { CacheService } from '@/lib/cache';
import { LoggerService } from '@/lib/logger';
import { SecurityService } from '@/lib/security';
import { I18nService } from '@/lib/i18n';
import { ErrorService } from '@/lib/errors';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PerformanceService } from '@/lib/performance';
import { LoggingService } from '@/lib/logging';
import { nanoid } from 'nanoid';
import { AuthorizationService } from '@/lib/authorization';
import { ValidationService } from '@/lib/validation';
import { RateLimitService } from '@/lib/rate-limit';
import { AnalyticsService } from '@/lib/analytics';
import { prometheus } from '@/lib/monitoring';
import { ConfigService } from '@/lib/config';

const cache = new CacheService();
const CACHE_CONTROL = {
  public: 'public, max-age=31536000, immutable',
  private: 'private, no-cache, no-store, must-revalidate',
  revalidate: 'public, max-age=0, must-revalidate'
};

let locales: string[] = [];

async function getLocales() {
  if (!locales.length) {
    const dbLocales = await prisma.locale.findMany({
      where: { active: true },
      select: { code: true }
    });
    locales = dbLocales.map(l => l.code);
  }
  return locales;
}

const seoService = new SEOService();
const monitoring = new MonitoringService();
const logger = new LoggerService();
const security = new SecurityService();
const i18n = new I18nService();
const errorService = new ErrorService();
const performance = new PerformanceService();
const logging = new LoggingService();
const authorization = new AuthorizationService();
const validation = new ValidationService();
const rateLimit = new RateLimitService();
const analytics = new AnalyticsService();
const config = new ConfigService();

const LOCALES = ['en', 'de', 'fr', 'es', 'it', 'ja', 'zh'];
const DEFAULT_LOCALE = 'en';

function getLocale(request: NextRequest): string {
  const negotiatorHeaders: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    negotiatorHeaders[key] = value;
  });

  const languages = new Negotiator({ headers: negotiatorHeaders }).languages();

  return match(
    languages,
    LOCALES,
    DEFAULT_LOCALE
  );
}

export default withAuth(
  async function middleware(req) {
    const token = await getToken({ req });
    const isAuth = !!token;
    const isAuthPage = req.nextUrl.pathname.startsWith('/auth');
    const isAdminPage = req.nextUrl.pathname.startsWith('/admin');
    const isApiAuthRoute = req.nextUrl.pathname.startsWith('/api/auth');
    const isApiAdminRoute = req.nextUrl.pathname.startsWith('/api/admin');

    // Überprüfe Redirects
    const redirect = await checkRedirect(req.nextUrl.pathname);
    if (redirect) return redirect;

    // Öffentliche API-Routen
    if (req.nextUrl.pathname.startsWith('/api') && !isApiAuthRoute && !isApiAdminRoute) {
      return NextResponse.next();
    }

    // Auth-Seiten Handling
    if (isAuthPage) {
      if (isAuth) {
        return NextResponse.redirect(new URL('/', req.url));
      }
      return NextResponse.next();
    }

    // Admin-Bereich Schutz
    if (isAdminPage || isApiAdminRoute) {
      if (!isAuth) {
        return NextResponse.redirect(new URL('/auth/login', req.url));
      }

      if (token?.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/', req.url));
      }

      return NextResponse.next();
    }

    // Geschützte API-Routen
    if (req.nextUrl.pathname.startsWith('/api')) {
      if (!isAuth) {
        return new NextResponse(
          JSON.stringify({ error: 'Nicht authentifiziert' }),
          { status: 401 }
        );
      }

      if (isApiAdminRoute && token?.role !== 'ADMIN') {
        return new NextResponse(
          JSON.stringify({ error: 'Nicht autorisiert' }),
          { status: 403 }
        );
      }
    }

    // Performance-Headers
    const response = NextResponse.next();
    
    response.headers.set('X-DNS-Prefetch-Control', 'on');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    
    // Cache-Control für statische Assets
    if (req.nextUrl.pathname.match(/\.(jpg|jpeg|png|webp|gif|css|js)$/)) {
      response.headers.set('Cache-Control', CACHE_CONTROL.public);
    }

    return response;
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

// Konfiguriere die Middleware für bestimmte Pfade
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
    '/sitemap.xml',
    '/robots.txt'
  ],
};

export async function middleware(request: NextRequest) {
  const requestId = nanoid();
  const start = Date.now();

  try {
    // Request loggen
    await logging.log('http', 'Incoming request', {
      requestId,
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(request.headers),
      ip: request.ip
    });

    const response = await NextResponse.next();

    // Response loggen
    await logging.log('http', 'Outgoing response', {
      requestId,
      status: response.status,
      duration: Date.now() - start,
      headers: Object.fromEntries(response.headers)
    });

    // Request Metriken
    prometheus.histogram('http_request_duration', {
      value: Date.now() - start,
      labels: {
        path: request.nextUrl.pathname,
        method: request.method,
        status: response.status
      }
    });

    return response;
  } catch (error) {
    // Error loggen
    await logging.log('error', 'Request failed', {
      requestId,
      error,
      duration: Date.now() - start
    });

    // Error Metriken
    prometheus.counter('http_request_errors', {
      value: 1,
      labels: {
        path: request.nextUrl.pathname,
        error: error.name
      }
    });

    throw error;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Prüfe auf Redirects
  const redirect = await seoService.handleRedirects(pathname);
  if (redirect) {
    return NextResponse.redirect(
      new URL(redirect.destination, request.url),
      redirect.statusCode
    );
  }

  // Spezielle Routen
  if (pathname === '/sitemap.xml') {
    const sitemap = await seoService.generateSitemap();
    return new NextResponse(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Content-Encoding': 'gzip'
      }
    });
  }

  if (pathname === '/robots.txt') {
    const robotsTxt = await seoService.generateRobotsTxt();
    return new NextResponse(robotsTxt, {
      headers: {
        'Content-Type': 'text/plain'
      }
    });
  }

  // Ignoriere statische Dateien
  if (
    pathname.includes('.') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api')
  ) {
    return NextResponse.next();
  }

  // Bestimme beste Locale
  const availableLocales = await getLocales();
  const defaultLocale = availableLocales[0];

  let locale;
  try {
    const languages = new Negotiator({
      headers: {
        'accept-language': request.headers.get('accept-language') || undefined
      }
    }).languages();

    locale = match(languages, availableLocales, defaultLocale);
  } catch (e) {
    locale = defaultLocale;
  }

  // Setze Locale in URL
  const newUrl = new URL(request.url);
  newUrl.pathname = `/${locale}${pathname}`;

  // Redirect zur lokalisierten URL
  return NextResponse.redirect(newUrl);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Statische Assets
  if (
    pathname.includes('/_next/') ||
    pathname.includes('/static/')
  ) {
    const response = NextResponse.next();
    response.headers.set(
      'Cache-Control',
      CACHE_CONTROL.public
    );
    return response;
  }

  // API-Routen
  if (pathname.startsWith('/api/')) {
    // Nur GET-Requests cachen
    if (request.method !== 'GET') {
      return NextResponse.next();
    }

    const cacheKey = `api:${pathname}:${request.headers.get('accept-language')}`;
    const cached = await cache.get(cacheKey);

    if (cached) {
      return NextResponse.json(cached);
    }

    const response = await NextResponse.next();
    const data = await response.json();

    await cache.set(cacheKey, data, {
      ttl: 300 // 5 Minuten
    });

    return NextResponse.json(data);
  }

  // SSG/ISR Seiten
  if (process.env.NODE_ENV === 'production') {
    const response = NextResponse.next();
    response.headers.set(
      'Cache-Control',
      CACHE_CONTROL.revalidate
    );
    return response;
  }

  return NextResponse.next();
}

export async function middleware(request: NextRequest) {
  try {
    // Token laden
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET
    })

    if (!token) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      )
    }

    // Resource aus URL extrahieren
    const path = request.nextUrl.pathname
    const [resourceType, resourceId] = path
      .split('/')
      .filter(Boolean)

    // Autorisierung prüfen
    const { allowed, reason } = await authorization.authorize({
      subject: {
        id: token.sub!,
        role: token.role as string,
        attributes: token
      },
      resource: {
        type: resourceType,
        id: resourceId,
        attributes: {
          path,
          method: request.method
        }
      },
      action: request.method.toLowerCase(),
      context: {
        headers: Object.fromEntries(request.headers),
        ip: request.ip
      }
    })

    if (!allowed) {
      return NextResponse.json(
        { error: 'Nicht autorisiert', reason },
        { status: 403 }
      )
    }

    return NextResponse.next()
  } catch (error) {
    console.error('Authorization error:', error)
    return NextResponse.json(
      { error: 'Autorisierungsfehler' },
      { status: 500 }
    )
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const pathnameIsMissingLocale = LOCALES.every(
    locale => !pathname.startsWith(`/${locale}/`)
  );

  if (pathnameIsMissingLocale) {
    const locale = getLocale(request);
    request.nextUrl.pathname = `/${locale}${pathname}`;
    return NextResponse.redirect(request.nextUrl);
  }

  const response = await NextResponse.next();

  // Content-Language Header setzen
  response.headers.set(
    'Content-Language',
    pathname.split('/')[1]
  );

  return response;
}

export async function middleware(request: NextRequest) {
  try {
    const response = await NextResponse.next()
    return response
  } catch (error) {
    // Error Context sammeln
    const session = await getServerSession(authOptions)
    const context = {
      type: error.name || 'UnknownError',
      severity: 'error',
      user: session?.user,
      source: 'middleware',
      request,
      metadata: {
        url: request.url,
        method: request.method,
        headers: Object.fromEntries(request.headers)
      }
    }

    // Error behandeln
    await errorService.handleError(error, context)

    // Benutzerfreundliche Antwort
    return NextResponse.json(
      { error: 'Ein Fehler ist aufgetreten' },
      { status: 500 }
    )
  }
}

export async function middleware(request: NextRequest) {
  const start = Date.now();

  try {
    // Request-Tracking starten
    const { span } = await performance.startSpan({
      name: request.url,
      type: 'http_request',
      metadata: {
        method: request.method,
        headers: Object.fromEntries(request.headers)
      }
    });

    const response = await NextResponse.next();

    // Performance-Metriken sammeln
    const duration = Date.now() - start;
    await performance.trackMetric({
      name: 'http_request_duration',
      value: duration,
      type: 'histogram',
      labels: {
        path: new URL(request.url).pathname,
        method: request.method,
        status: response.status
      }
    });

    // Span beenden
    await span.end({
      status: response.status,
      duration
    });

    return response;
  } catch (error) {
    // Error-Metrik tracken
    await performance.trackMetric({
      name: 'http_request_error',
      value: 1,
      type: 'counter',
      labels: {
        path: new URL(request.url).pathname,
        error: error.name
      }
    });

    throw error;
  }
}

export async function middleware(request: NextRequest) {
  // Nur GET Requests cachen
  if (request.method !== 'GET') {
    return NextResponse.next()
  }

  try {
    // Cache-Key generieren
    const key = request.url

    // Cache prüfen
    const cachedResponse = await cache.get<Response>(key, {
      namespace: 'http',
      ttl: 300, // 5 Minuten
      tags: ['http_response']
    })

    if (cachedResponse) {
      return cachedResponse
    }

    // Response generieren
    const response = await NextResponse.next()

    // Response cachen
    await cache.set(key, response, {
      namespace: 'http',
      ttl: 300,
      tags: ['http_response']
    })

    return response
  } catch (error) {
    console.error('Cache error:', error)
    return NextResponse.next()
  }
}

export async function middleware(request: NextRequest) {
  try {
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      const data = await request.json()
      const path = request.nextUrl.pathname
      const schema = validation.schemas[path.split('/')[1]]
      
      if (schema) {
        await validation.validate(data, schema)
      }
    }
    
    return NextResponse.next()
  } catch (error) {
    return NextResponse.json(
      { error: 'Validierungsfehler' },
      { status: 400 }
    )
  }
}

export async function middleware(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    const locale = token?.locale || request.headers.get('accept-language')?.split(',')[0] || 'en'
    
    request.headers.set('x-locale', locale)
    const response = await NextResponse.next()
    
    if (response.headers.get('content-type')?.includes('application/json')) {
      const data = await response.json()
      const translated = await translateDeep(data, locale)
      return NextResponse.json(translated)
    }
    
    return response
  } catch (error) {
    return NextResponse.next()
  }
}

async function translateDeep(obj: any, locale: string): Promise<any> {
  if (typeof obj !== 'object') return obj
  
  const result: any = Array.isArray(obj) ? [] : {}
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object') {
      result[key] = await translateDeep(value, locale)
    } else if (key.endsWith('_i18n')) {
      result[key.replace('_i18n', '')] = await i18n.translate(value, locale)
    } else {
      result[key] = value
    }
  }
  
  return result
}

export async function middleware(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    const key = token?.sub || request.ip

    const { success, headers } = await rateLimit.limit(key, {
      max: 100,
      windowMs: 60 * 1000,
      type: 'sliding',
      headers: true
    })

    if (!success) {
      return NextResponse.json(
        { error: 'Zu viele Anfragen' },
        { 
          status: 429,
          headers
        }
      )
    }

    const response = await NextResponse.next()
    Object.entries(headers || {}).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    
    return response
  } catch (error) {
    return NextResponse.next()
  }
}

export async function middleware(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    const start = Date.now()
    
    const response = await NextResponse.next()
    
    // Request tracken
    await analytics.track({
      name: 'page_view',
      userId: token?.sub,
      sessionId: request.cookies.get('sessionId')?.value,
      properties: {
        path: request.nextUrl.pathname,
        method: request.method,
        status: response.status,
        duration: Date.now() - start,
        userAgent: request.headers.get('user-agent'),
        referer: request.headers.get('referer')
      }
    })
    
    return response
  } catch (error) {
    return NextResponse.next()
  }
}

export async function middleware(request: NextRequest) {
  try {
    // Security Scan
    const { safe, threats } = await security.scanRequest(request)
    
    if (!safe) {
      return NextResponse.json(
        { error: 'Sicherheitsverstoß erkannt', threats },
        { status: 403 }
      )
    }
    
    const response = await NextResponse.next()
    
    // Security Headers
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    
    return response
  } catch (error) {
    return NextResponse.json(
      { error: 'Sicherheitsfehler' },
      { status: 500 }
    )
  }
}

export async function middleware(request: NextRequest) {
  try {
    // Feature Flags prüfen
    const featureFlags = await config.get('FEATURE_FLAGS', {
      type: 'json',
      default: {}
    })
    
    const path = request.nextUrl.pathname
    if (path.startsWith('/api/v2') && !featureFlags.apiV2) {
      return NextResponse.json(
        { error: 'Feature nicht verfügbar' },
        { status: 404 }
      )
    }
    
    // Environment-spezifische Konfiguration
    const env = await config.get('NODE_ENV')
    if (env === 'maintenance' && !path.startsWith('/maintenance')) {
      return NextResponse.redirect(new URL('/maintenance', request.url))
    }
    
    return NextResponse.next()
  } catch (error) {
    return NextResponse.json(
      { error: 'Konfigurationsfehler' },
      { status: 500 }
    )
  }
} 