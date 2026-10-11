import React from 'react';

type PageContainerVariant = 'default' | 'wide' | 'profile' | 'full' | 'dashboard';

const variantClass: Record<PageContainerVariant, string> = {
  default: 'mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6',
  wide: 'mx-auto w-full max-w-[1600px] px-3 sm:px-4 lg:px-6 py-3 sm:py-4',
  dashboard: 'w-full max-w-none overflow-x-hidden px-2.5 sm:px-4 lg:px-6 xl:px-8 2xl:px-10 3xl:px-12 4xl:px-16 py-2 sm:py-3 xl:py-4 2xl:py-5 3xl:py-6 4xl:py-8',
  profile: 'mx-auto w-full max-w-7xl px-3 sm:px-4 lg:px-6 py-4 sm:py-8 lg:py-12',
  full: 'w-full min-h-full',
};

export function resolvePageContainerVariant(pathname: string): PageContainerVariant {
  if (pathname.includes('/profile')) return 'profile';
  if (
    pathname === '/' ||
    pathname.endsWith('/dashboard') ||
    pathname.includes('/dashboard/')
  ) {
    return 'dashboard';
  }
  if (
    pathname.includes('/workspace') ||
    pathname.includes('/session-planning') ||
    pathname.includes('/calls') ||
    pathname.includes('/marketplace') ||
    pathname.includes('/gig/') ||
    pathname.includes('/company/')
  ) {
    return 'wide';
  }
  return 'default';
}

export function PageContainer({
  variant = 'default',
  className = '',
  children,
}: {
  variant?: PageContainerVariant;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`${variantClass[variant]} ${className}`.trim()}>{children}</div>
  );
}
