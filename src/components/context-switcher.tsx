'use client';

import { useContext, useState } from 'react';
import { SessionContext } from '@/contexts/session-context';
import { ChevronDown } from 'lucide-react';

export function ContextSwitcher() {
  const { userAssignments, currentContext, setCurrentContext } = useContext(SessionContext);
  const [isOpen, setIsOpen] = useState(false);

  // Group assignments by company
  const companiesMap = new Map<string, { company: any; assignments: any[] }>();
  userAssignments.forEach((a) => {
    const key = a.companyId;
    if (!companiesMap.has(key)) {
      companiesMap.set(key, {
        company: a.company,
        assignments: [],
      });
    }
    companiesMap.get(key)!.assignments.push(a);
  });

  const handleSelect = async (assignment: any) => {
    await setCurrentContext({
      userId: assignment.userId,
      companyId: assignment.companyId,
      companyName: assignment.company.companyName,
      companyRelationshipId: assignment.companyRelationshipId,
      relationshipName: assignment.companyRelationship
        ? `${assignment.companyRelationship.fromCompany.companyName} ↔ ${assignment.companyRelationship.toCompany.companyName}`
        : null,
      designationId: assignment.designationId,
      designationName: assignment.designation.designationName,
      permissions: assignment.designation.permissions.map((p: any) => p.permission.permissionKey),
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
          {Array.from(companiesMap.values()).map(({ company, assignments }) => (
            <div key={company.companyId} className="border-b last:border-b-0">
              <div className="px-4 py-3 bg-gray-50 font-semibold text-sm border-b">
                {company.companyName}
                <span className="ml-2 text-xs text-gray-500 font-normal">({company.companyType})</span>
              </div>
              {assignments.map((a: any) => (
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
                  <div className="font-medium text-sm text-gray-900">{a.designation.designationName}</div>
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
