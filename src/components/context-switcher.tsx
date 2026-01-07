'use client';

import { useContext, useState } from 'react';
import { SessionContext } from '@/contexts/session-context';
import { ChevronDown } from 'lucide-react';

export function ContextSwitcher() {
  const { userAssignments, currentContext, setCurrentContext } = useContext(SessionContext);
  const [isOpen, setIsOpen] = useState(false);

  // Group assignments by company (using flat structure from auth)
  const companiesMap = new Map<string, { companyId: string; companyName: string; companyType: string; assignments: any[] }>();
  userAssignments.forEach((a) => {
    const key = a.companyId;
    if (!companiesMap.has(key)) {
      companiesMap.set(key, {
        companyId: a.companyId,
        companyName: a.companyName,
        companyType: a.companyType,
        assignments: [],
      });
    }
    companiesMap.get(key)!.assignments.push(a);
  });

  const handleSelect = async (assignment: any) => {
    // Build relationship name if exists
    let relationshipName = null;
    if (assignment.companyRelationship) {
      const rel = assignment.companyRelationship;
      relationshipName = `${rel.fromCompany.companyName} ↔ ${rel.toCompany.companyName}`;
    }

    await setCurrentContext({
      userId: currentContext?.userId || '',
      companyId: assignment.companyId,
      companyName: assignment.companyName,
      companyType: assignment.companyType,
      companyRelationshipId: assignment.companyRelationshipId,
      relationshipName,
      designationId: assignment.designationId,
      designationName: assignment.designationName,
      permissions: assignment.permissions || [],
      services: assignment.services || [],
    });
    setIsOpen(false);
  };

  if (userAssignments.length === 0) {
    return null;
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 text-sm"
      >
        <span className="font-medium text-gray-900">{currentContext?.companyName}</span>
        <span className="text-gray-400">|</span>
        <span className="text-gray-600">{currentContext?.designationName}</span>
        <ChevronDown size={16} className="text-gray-500" />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 w-96 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {Array.from(companiesMap.values()).map((company) => (
            <div key={company.companyId} className="border-b last:border-b-0">
              <div className="px-4 py-3 bg-gray-50 font-semibold text-sm border-b">
                {company.companyName}
                <span className="ml-2 text-xs text-gray-500 font-normal">({company.companyType})</span>
              </div>
              {company.assignments.map((a: any) => (
                <button
                  key={a.userCompanyAssignmentId}
                  onClick={() => handleSelect(a)}
                  className={`w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b last:border-b-0 ${
                    currentContext?.companyId === a.companyId &&
                    currentContext?.companyRelationshipId === a.companyRelationshipId
                      ? 'bg-blue-100'
                      : ''
                  }`}
                >
                  <div className="font-medium text-sm text-gray-900">{a.designationName}</div>
                  {a.companyRelationship && (
                    <div className="text-xs text-gray-500 mt-1">
                      Scope: {a.companyRelationship.fromCompany.companyName} ↔{' '}
                      {a.companyRelationship.toCompany.companyName}
                    </div>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
