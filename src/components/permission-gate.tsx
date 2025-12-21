'use client';

import { useContext, ReactNode } from 'react';
import { SessionContext } from '@/contexts/session-context';

interface PermissionGateProps {
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGate({
  permission,
  permissions,
  requireAll = false,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { currentContext } = useContext(SessionContext);
  const userPermissions = currentContext?.permissions || [];

  let hasAccess = false;

  if (permission) {
    hasAccess = userPermissions.includes(permission);
  } else if (permissions) {
    if (requireAll) {
      hasAccess = permissions.every((p) => userPermissions.includes(p));
    } else {
      hasAccess = permissions.some((p) => userPermissions.includes(p));
    }
  } else {
    hasAccess = true; // No permission required
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}
