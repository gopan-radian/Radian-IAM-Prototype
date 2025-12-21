'use client';

import { useState, useEffect, useContext } from 'react';
import { PermissionGate } from '@/components/permission-gate';
import { SessionContext } from '@/contexts/session-context';
import {
  AlertCircle, Lock, Key, Building2, Check, X,
  Loader2, Save, ChevronDown, ChevronRight
} from 'lucide-react';

interface Permission {
  permissionId: string;
  permissionKey: string;
  permissionDescription: string;
  permissionCategory: string;
  isGranted: boolean;
  grantedInfo?: {
    grantedBy?: {
      firstName: string;
      lastName: string;
      email: string;
    };
    createdAt: string;
  };
}

interface Company {
  companyId: string;
  companyName: string;
  companyType: string;
  companyStatus: string;
}

const categoryLabels: Record<string, string> = {
  DEALS: 'Deal Management',
  REPORTS: 'Reports & Analytics',
  USERS: 'User Management',
  SETTINGS: 'Settings',
  ADMIN: 'Admin (Radian Only)',
};

const categoryColors: Record<string, string> = {
  DEALS: 'bg-blue-500',
  REPORTS: 'bg-green-500',
  USERS: 'bg-purple-500',
  SETTINGS: 'bg-orange-500',
  ADMIN: 'bg-red-500',
};

export default function CompanyPermissionsPage() {
  const { currentContext } = useContext(SessionContext);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [groupedPermissions, setGroupedPermissions] = useState<Record<string, Permission[]>>({});
  const [loading, setLoading] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['DEALS', 'REPORTS', 'USERS', 'SETTINGS']));
  const [originalPermissions, setOriginalPermissions] = useState<Set<string>>(new Set());

  // Fetch companies on mount
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await fetch('/api/companies');
        if (!response.ok) throw new Error('Failed to fetch companies');
        const data = await response.json();
        // Filter out Radian company (can't modify its permissions)
        const filteredCompanies = data.filter((c: Company) => c.companyType !== 'RADIAN');
        setCompanies(filteredCompanies);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load companies');
      } finally {
        setLoadingCompanies(false);
      }
    };
    fetchCompanies();
  }, []);

  // Fetch permissions when company is selected
  useEffect(() => {
    if (!selectedCompanyId) {
      setPermissions([]);
      setGroupedPermissions({});
      return;
    }

    const fetchPermissions = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/company-permissions?companyId=${selectedCompanyId}`);
        if (!response.ok) throw new Error('Failed to fetch permissions');
        const data = await response.json();
        setPermissions(data.permissions);
        setGroupedPermissions(data.grouped);
        // Store original state for detecting changes
        const granted = new Set<string>(
          data.permissions.filter((p: Permission) => p.isGranted).map((p: Permission) => p.permissionId)
        );
        setOriginalPermissions(granted);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load permissions');
      } finally {
        setLoading(false);
      }
    };
    fetchPermissions();
  }, [selectedCompanyId]);

  const togglePermission = (permissionId: string) => {
    setPermissions((prev) =>
      prev.map((p) =>
        p.permissionId === permissionId ? { ...p, isGranted: !p.isGranted } : p
      )
    );
    setGroupedPermissions((prev) => {
      const updated = { ...prev };
      for (const category in updated) {
        updated[category] = updated[category].map((p) =>
          p.permissionId === permissionId ? { ...p, isGranted: !p.isGranted } : p
        );
      }
      return updated;
    });
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedCompanyId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const grantedPermissionIds = permissions
        .filter((p) => p.isGranted)
        .map((p) => p.permissionId);

      const response = await fetch('/api/company-permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: selectedCompanyId,
          permissionIds: grantedPermissionIds,
          grantedByUserId: currentContext?.userId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save permissions');
      }

      const data = await response.json();
      setSuccess(`Permissions updated: ${data.added} added, ${data.removed} removed`);
      setOriginalPermissions(new Set(grantedPermissionIds));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = () => {
    const currentGranted = new Set(
      permissions.filter((p) => p.isGranted).map((p) => p.permissionId)
    );
    if (currentGranted.size !== originalPermissions.size) return true;
    for (const id of currentGranted) {
      if (!originalPermissions.has(id)) return true;
    }
    return false;
  };

  const selectedCompany = companies.find((c) => c.companyId === selectedCompanyId);
  const grantedCount = permissions.filter((p) => p.isGranted).length;

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Lock className="text-red-600" size={32} />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Company Permissions</h1>
            <p className="text-gray-600">Control what permissions each company can use</p>
          </div>
        </div>
      </div>

      <PermissionGate
        permission="admin.company_permissions"
        fallback={
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-red-600" size={24} />
              <div>
                <h3 className="font-semibold text-red-900">Access Denied</h3>
                <p className="text-red-700 text-sm">You don't have permission to access this page.</p>
              </div>
            </div>
          </div>
        }
      >
        {/* Company Selector */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Company
          </label>
          {loadingCompanies ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="animate-spin" size={20} />
              <span>Loading companies...</span>
            </div>
          ) : (
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full max-w-md px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a company...</option>
              {companies.map((company) => (
                <option key={company.companyId} value={company.companyId}>
                  {company.companyName} ({company.companyType})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle size={20} />
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-auto">
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 text-green-700">
              <Check size={20} />
              <span>{success}</span>
              <button onClick={() => setSuccess(null)} className="ml-auto">
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Permission Matrix */}
        {selectedCompanyId && (
          <>
            {/* Stats Header */}
            <div className="bg-white rounded-lg shadow p-4 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Building2 className="text-gray-400" size={24} />
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedCompany?.companyName}</h3>
                  <p className="text-sm text-gray-500">{selectedCompany?.companyType}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{grantedCount}</div>
                  <div className="text-xs text-gray-500">Granted</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-400">{permissions.length - grantedCount}</div>
                  <div className="text-xs text-gray-500">Not Granted</div>
                </div>
                <button
                  onClick={handleSave}
                  disabled={saving || !hasChanges()}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <Save size={18} />
                  )}
                  Save Changes
                </button>
              </div>
            </div>

            {/* Loading State */}
            {loading ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <Loader2 className="animate-spin mx-auto mb-2" size={32} />
                <p className="text-gray-600">Loading permissions...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedPermissions).map(([category, categoryPermissions]) => (
                  <div key={category} className="bg-white rounded-lg shadow overflow-hidden">
                    {/* Category Header */}
                    <button
                      onClick={() => toggleCategory(category)}
                      className="w-full flex items-center justify-between px-6 py-4 bg-gray-50 hover:bg-gray-100"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${categoryColors[category]}`} />
                        <span className="font-semibold text-gray-900">
                          {categoryLabels[category] || category}
                        </span>
                        <span className="text-sm text-gray-500">
                          ({categoryPermissions.filter((p) => p.isGranted).length}/{categoryPermissions.length})
                        </span>
                      </div>
                      {expandedCategories.has(category) ? (
                        <ChevronDown size={20} className="text-gray-400" />
                      ) : (
                        <ChevronRight size={20} className="text-gray-400" />
                      )}
                    </button>

                    {/* Permission List */}
                    {expandedCategories.has(category) && (
                      <div className="divide-y divide-gray-100">
                        {categoryPermissions.map((permission) => (
                          <div
                            key={permission.permissionId}
                            className="flex items-center justify-between px-6 py-3 hover:bg-gray-50"
                          >
                            <div className="flex items-center gap-3">
                              <Key size={16} className="text-gray-400" />
                              <div>
                                <code className="text-sm font-mono text-gray-800">
                                  {permission.permissionKey}
                                </code>
                                <p className="text-sm text-gray-500">
                                  {permission.permissionDescription}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => togglePermission(permission.permissionId)}
                              className={`relative w-12 h-6 rounded-full transition-colors ${
                                permission.isGranted ? 'bg-green-500' : 'bg-gray-300'
                              }`}
                            >
                              <div
                                className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                                  permission.isGranted ? 'translate-x-7' : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!selectedCompanyId && !loadingCompanies && (
          <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-12 text-center">
            <Building2 className="mx-auto mb-4 text-gray-400" size={48} />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Company</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Choose a company from the dropdown above to manage their available permissions.
              Companies can only assign permissions from their granted pool to their roles.
            </p>
          </div>
        )}
      </PermissionGate>
    </div>
  );
}
