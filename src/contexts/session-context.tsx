'use client';

import { createContext, useState, useEffect, ReactNode } from 'react';
import { useSession } from 'next-auth/react';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  permission: string | null;
  children?: NavItem[];
}

interface RouteItem {
  routeId: string;
  routePath: string;
  routeLabel: string;
  routeIcon: string;
  showOnSideMenu: boolean;
  parentRouteId: string | null;
}

/**
 * Flatten navigation tree into array format expected by sidebar
 */
function flattenNavigation(items: NavItem[], parentId: string | null = null): RouteItem[] {
  const result: RouteItem[] = [];

  for (const item of items) {
    const routeId = item.path.replace(/\//g, '-').slice(1) || 'home';

    result.push({
      routeId,
      routePath: item.path,
      routeLabel: item.label,
      routeIcon: item.icon,
      showOnSideMenu: true,
      parentRouteId: parentId,
    });

    if (item.children) {
      result.push(...flattenNavigation(item.children, routeId));
    }
  }

  return result;
}

export interface CurrentContext {
  userId: string;
  companyId: string;
  companyName: string;
  companyType: string;
  companyRelationshipId: string | null;
  relationshipName: string | null;
  designationId: string;
  designationName: string;
  permissions: string[];
}

interface SessionContextType {
  currentContext: CurrentContext | null;
  setCurrentContext: (context: CurrentContext) => Promise<void>;
  userAssignments: any[];
  accessibleRoutes: any[];
  loading: boolean;
}

export const SessionContext = createContext<SessionContextType>({
  currentContext: null,
  setCurrentContext: async () => {},
  userAssignments: [],
  accessibleRoutes: [],
  loading: true,
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [currentContext, setCurrentContextState] = useState<CurrentContext | null>(null);
  const [userAssignments, setUserAssignments] = useState<any[]>([]);
  const [accessibleRoutes, setAccessibleRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeSession = async () => {
      const userSession = session as any;
      if (userSession?.user?.assignments) {
        setUserAssignments(userSession.user.assignments);

        // Set initial context to first assignment
        if (userSession.user.assignments.length > 0) {
          const firstAssignment = userSession.user.assignments[0];
          const context: CurrentContext = {
            userId: firstAssignment.userId,
            companyId: firstAssignment.companyId,
            companyName: firstAssignment.company.companyName,
            companyType: firstAssignment.company.companyType,
            companyRelationshipId: firstAssignment.companyRelationshipId,
            relationshipName: firstAssignment.companyRelationship
              ? `${firstAssignment.companyRelationship.fromCompany.companyName} ↔ ${firstAssignment.companyRelationship.toCompany.companyName}`
              : null,
            designationId: firstAssignment.designationId,
            designationName: firstAssignment.designation.designationName,
            permissions: firstAssignment.designation.permissions.map((p: any) => p.permission.permissionKey),
          };
          setCurrentContextState(context);

          // Fetch accessible routes
          try {
            const response = await fetch('/api/routes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ permissions: context.permissions }),
            });
            const data = await response.json();
            // The API now returns { navigation, accessiblePages, visibleSidebarItems }
            // Convert navigation to the format expected by the sidebar
            const routes = flattenNavigation(data.navigation || []);
            setAccessibleRoutes(routes);
          } catch (error) {
            console.error('Failed to fetch routes:', error);
            setAccessibleRoutes([]);
          }
        }
      }
      setLoading(false);
    };

    initializeSession();
  }, [session]);

  const setCurrentContext = async (context: CurrentContext) => {
    setCurrentContextState(context);

    // Fetch accessible routes for new context
    try {
      const response = await fetch('/api/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: context.permissions }),
      });
      const data = await response.json();
      const routes = flattenNavigation(data.navigation || []);
      setAccessibleRoutes(routes);
    } catch (error) {
      console.error('Failed to fetch routes:', error);
      setAccessibleRoutes([]);
    }
  };

  return (
    <SessionContext.Provider
      value={{
        currentContext,
        setCurrentContext,
        userAssignments,
        accessibleRoutes,
        loading,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}
