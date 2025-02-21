export default function Hero() {
  return (
    <div className="relative">
      <div className="absolute inset-0">
        <img
          className="w-full h-full object-cover"
          src="/images/hero.jpg"
          alt="Hero"
        />
        <div className="absolute inset-0 bg-gray-900 opacity-60" />
      </div>
      <div className="relative max-w-7xl mx-auto py-24 px-4 sm:py-32 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
          Smartphones & Elektronik
        </h1>
        <p className="mt-6 text-xl text-white max-w-3xl">
          Kaufen Sie hochwertige Elektronik oder verkaufen Sie Ihre gebrauchten 
          Geräte zu fairen Preisen. Schnell, einfach und sicher.
        </p>
        <div className="mt-10 flex space-x-4">
          <a
            href="/products"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Shop entdecken
          </a>
          <a
            href="/trade-in"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-gray-50"
          >
            Gerät verkaufen
          </a>
        </div>
      </div>
    </div>
  );
} 