import React from 'react';

type PageContainerVariant = 'default' | 'wide' | 'profile' | 'full';

const variantClass: Record<PageContainerVariant, string> = {
  default: 'mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6',
  wide: 'mx-auto w-full max-w-[1600px] px-3 sm:px-4 lg:px-6 py-3 sm:py-4',
  profile: 'mx-auto w-full max-w-7xl px-3 sm:px-4 lg:px-6 py-4 sm:py-8 lg:py-12',
  full: 'w-full min-h-full',
};

export function resolvePageContainerVariant(pathname: string): PageContainerVariant {
  if (pathname.includes('/profile')) return 'profile';
  if (
    pathname.includes('/workspace') ||
    pathname.includes('/session-planning') ||
    pathname.includes('/calls')
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
