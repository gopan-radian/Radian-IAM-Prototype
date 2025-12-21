'use client';

import { createContext, useState, useEffect, ReactNode } from 'react';
import { useSession } from 'next-auth/react';

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
            const routes = await response.json();
            setAccessibleRoutes(routes);
          } catch (error) {
            console.error('Failed to fetch routes:', error);
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
      const routes = await response.json();
      setAccessibleRoutes(routes);
    } catch (error) {
      console.error('Failed to fetch routes:', error);
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
