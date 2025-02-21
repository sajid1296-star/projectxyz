'use client';

import { Fragment, useState } from 'react';
import { Dialog, Popover, Transition } from '@headlessui/react';
import { Bars3Icon, XMarkIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useCart } from '@/components/cart/CartProvider';
import CartSidebar from '@/components/cart/CartSidebar';
import MobileMenu from './MobileMenu';

const navigation = {
  categories: [
    {
      name: 'Produkte',
      featured: [
        { name: 'Smartphones', href: '/products/category/smartphones' },
        { name: 'Tablets', href: '/products/category/tablets' },
        { name: 'Laptops', href: '/products/category/laptops' },
      ],
    },
  ],
  pages: [
    { name: 'Trade-In', href: '/trade-in' },
    { name: 'Über uns', href: '/about' },
  ],
};

export default function Header() {
  const { data: session } = useSession();
  const { state } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-white">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex lg:flex-1">
            <Link href="/" className="-m-1.5 p-1.5">
              <span className="text-2xl font-bold">TechTrade</span>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="flex lg:hidden">
            <button
              type="button"
              className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>

          {/* Desktop menu */}
          <Popover.Group className="hidden lg:flex lg:gap-x-12">
            {navigation.categories.map((category) => (
              <div key={category.name} className="relative">
                <Popover className="relative">
                  {({ open }) => (
                    <>
                      <Popover.Button className="flex items-center gap-x-1 text-sm font-semibold leading-6 text-gray-900">
                        {category.name}
                      </Popover.Button>

                      <Transition
                        as={Fragment}
                        enter="transition ease-out duration-200"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="transition ease-in duration-150"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                      >
                        <Popover.Panel className="absolute top-full z-10 mt-3 w-screen max-w-md overflow-hidden rounded-3xl bg-white shadow-lg ring-1 ring-gray-900/5">
                          <div className="p-4">
                            {category.featured.map((item) => (
                              <div
                                key={item.name}
                                className="group relative flex items-center gap-x-6 rounded-lg p-4 text-sm leading-6 hover:bg-gray-50"
                              >
                                <div className="flex-auto">
                                  <Link href={item.href} className="block font-semibold text-gray-900">
                                    {item.name}
                                    <span className="absolute inset-0" />
                                  </Link>
                                </div>
                              </div>
                            ))}
                          </div>
                        </Popover.Panel>
                      </Transition>
                    </>
                  )}
                </Popover>
              </div>
            ))}

            {navigation.pages.map((page) => (
              <Link
                key={page.name}
                href={page.href}
                className="text-sm font-semibold leading-6 text-gray-900"
              >
                {page.name}
              </Link>
            ))}
          </Popover.Group>

          {/* User menu */}
          <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:gap-x-6">
            <Link href="/cart" className="text-sm font-semibold leading-6 text-gray-900">
              <ShoppingCartIcon className="h-6 w-6" aria-hidden="true" />
            </Link>
            
            {session ? (
              <>
                <Link href="/profile" className="text-sm font-semibold leading-6 text-gray-900">
                  Profil
                </Link>
                <button
                  onClick={() => signOut()}
                  className="text-sm font-semibold leading-6 text-gray-900"
                >
                  Abmelden
                </button>
              </>
            ) : (
              <Link href="/auth/login" className="text-sm font-semibold leading-6 text-gray-900">
                Anmelden
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      <Dialog as="div" className="lg:hidden" open={mobileMenuOpen} onClose={setMobileMenuOpen}>
        {/* ... Mobile menu content ... */}
      </Dialog>

      <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </header>
  );
} 