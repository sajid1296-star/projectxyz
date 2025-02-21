import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

// Cache für die Wartungsmodus-Einstellung
let maintenanceMode: boolean | null = null;
let lastCheck = 0;
const CACHE_DURATION = 60000; // 1 Minute Cache

export async function withMaintenance(request: NextRequest) {
  // Prüfe ob der Cache aktualisiert werden muss
  const now = Date.now();
  if (maintenanceMode === null || now - lastCheck > CACHE_DURATION) {
    const settings = await prisma.settings.findFirst();
    maintenanceMode = settings?.maintenanceMode ?? false;
    lastCheck = now;
  }

  // Erlaube Zugriff auf Admin und API Routen
  if (
    request.nextUrl.pathname.startsWith('/admin') ||
    request.nextUrl.pathname.startsWith('/api/admin') ||
    request.nextUrl.pathname.startsWith('/auth')
  ) {
    return NextResponse.next();
  }

  // Zeige Wartungsseite für alle anderen Routen
  if (maintenanceMode) {
    const url = request.nextUrl.clone();
    url.pathname = '/maintenance';
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
} 