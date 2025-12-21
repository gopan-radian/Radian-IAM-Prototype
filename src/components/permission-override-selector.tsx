'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, X, Info } from 'lucide-react';

interface Permission {
  permissionId: string;
  permissionKey: string;
  permissionDescription: string;
  permissionCategory: string;
}

export interface PermissionOverride {
  permissionId: string;
  effect: 'ALLOW' | 'DENY';
  reason?: string;
}

interface PermissionOverrideSelectorProps {
  availablePermissions: Permission[];
  adminPermissions: string[]; // Permission keys the admin has
  rolePermissions: string[]; // Permission keys from selected role
  selectedOverrides: PermissionOverride[];
  onChange: (overrides: PermissionOverride[]) => void;
  disabled?: boolean;
}

export function PermissionOverrideSelector({
  availablePermissions,
  adminPermissions,
  rolePermissions,
  selectedOverrides,
  onChange,
  disabled = false,
}: PermissionOverrideSelectorProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Group permissions by category
  const grouped = availablePermissions.reduce((acc, permission) => {
    const category = permission.permissionCategory;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleOverride = (permissionId: string, effect: 'ALLOW' | 'DENY') => {
    if (disabled) return;

    const existingIndex = selectedOverrides.findIndex(
      (o) => o.permissionId === permissionId
    );

    if (existingIndex >= 0) {
      // Remove if clicking same effect, otherwise update
      const existing = selectedOverrides[existingIndex];
      if (existing.effect === effect) {
        onChange(selectedOverrides.filter((_, i) => i !== existingIndex));
      } else {
        const updated = [...selectedOverrides];
        updated[existingIndex] = { ...existing, effect };
        onChange(updated);
      }
    } else {
      // Add new override
      onChange([...selectedOverrides, { permissionId, effect }]);
    }
  };

  const getOverrideForPermission = (permissionId: string) => {
    return selectedOverrides.find((o) => o.permissionId === permissionId);
  };

  const getCategoryStats = (permissions: Permission[]) => {
    let fromRole = 0;
    let added = 0;
    let canAdd = 0;

    for (const p of permissions) {
      const isInRole = rolePermissions.includes(p.permissionKey);
      const override = getOverrideForPermission(p.permissionId);
      const canAssign = adminPermissions.includes(p.permissionKey);

      if (isInRole) {
        fromRole++;
      } else if (override?.effect === 'ALLOW') {
        added++;
      } else if (canAssign) {
        canAdd++;
      }
    }

    return { fromRole, added, canAdd, total: permissions.length };
  };

  if (availablePermissions.length === 0) {
    return (
      <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">
        No permissions available to configure.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-700">Permission Overrides</h4>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            From Role
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            Added
          </span>
        </div>
      </div>

      <p className="text-xs text-gray-500 mb-4">
        Add extra permissions beyond the role. You can only add permissions you have.
      </p>

      <div className="border rounded-lg divide-y">
        {Object.entries(grouped).map(([category, permissions]) => {
          const isExpanded = expandedCategories.has(category);
          const stats = getCategoryStats(permissions);

          return (
            <div key={category}>
              <button
                type="button"
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown size={16} className="text-gray-400" />
                  ) : (
                    <ChevronRight size={16} className="text-gray-400" />
                  )}
                  <span className="text-sm font-medium text-gray-700">
                    {category}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {stats.fromRole > 0 && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded">
                      {stats.fromRole} from role
                    </span>
                  )}
                  {stats.added > 0 && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                      +{stats.added} added
                    </span>
                  )}
                  <span className="text-gray-400">
                    {permissions.length} total
                  </span>
                </div>
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 space-y-2">
                  {permissions.map((permission) => {
                    const isInRole = rolePermissions.includes(permission.permissionKey);
                    const override = getOverrideForPermission(permission.permissionId);
                    const canAssign = adminPermissions.includes(permission.permissionKey);
                    const isAdded = override?.effect === 'ALLOW';

                    return (
                      <div
                        key={permission.permissionId}
                        className={`flex items-center justify-between p-2 rounded-lg ${
                          isInRole
                            ? 'bg-green-50 border border-green-200'
                            : isAdded
                            ? 'bg-blue-50 border border-blue-200'
                            : 'bg-gray-50 border border-gray-200'
                        } ${!canAssign && !isInRole ? 'opacity-50' : ''}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-900 truncate">
                              {permission.permissionDescription}
                            </span>
                            {isInRole && (
                              <span className="text-xs px-1.5 py-0.5 bg-green-200 text-green-800 rounded">
                                Role
                              </span>
                            )}
                            {isAdded && (
                              <span className="text-xs px-1.5 py-0.5 bg-blue-200 text-blue-800 rounded">
                                Added
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            {permission.permissionKey}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 ml-2">
                          {isInRole ? (
                            <span className="text-xs text-green-600 flex items-center gap-1">
                              <Info size={12} />
                              Included in role
                            </span>
                          ) : canAssign ? (
                            <button
                              type="button"
                              onClick={() => toggleOverride(permission.permissionId, 'ALLOW')}
                              disabled={disabled}
                              className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                                isAdded
                                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                            >
                              {isAdded ? (
                                <>
                                  <X size={12} />
                                  Remove
                                </>
                              ) : (
                                <>
                                  <Plus size={12} />
                                  Add
                                </>
                              )}
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">
                              Not assignable
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedOverrides.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700">
              {selectedOverrides.filter((o) => o.effect === 'ALLOW').length} permission(s) will be added
            </span>
            <button
              type="button"
              onClick={() => onChange([])}
              disabled={disabled}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Clear all
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
