import type { FC, ReactNode } from 'react';

export interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: string;
}

declare const ProtectedRoute: FC<ProtectedRouteProps>;
export default ProtectedRoute;
