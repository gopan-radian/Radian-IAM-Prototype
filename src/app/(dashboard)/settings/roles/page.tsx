'use client';

import { useState, useEffect, useContext, useMemo } from 'react';
import { PermissionGate } from '@/components/permission-gate';
import { SessionContext } from '@/contexts/session-context';
import {
  AlertCircle, Shield, Plus, Pencil, Trash2,
  Loader2, X, Users, Key, Check, ChevronDown, ChevronRight,
  LayoutDashboard, FileText, BarChart3, Settings, Lock, Menu
} from 'lucide-react';

const inputClassName = "w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none";

interface Permission {
  permissionId: string;
  permissionKey: string;
  permissionDescription: string;
  permissionCategory: string;
}

interface RolePermission {
  permission: Permission;
}

interface Role {
  designationId: string;
  designationName: string;
  designationStatus: string;
  createdAt: string;
  permissions: RolePermission[];
  _count: {
    userAssignments: number;
  };
}

interface AvailablePermission extends Permission {
  isSelected: boolean;
}

interface RoutePermission {
  permission: {
    permissionId: string;
    permissionKey: string;
  };
}

interface Route {
  routeId: string;
  routePath: string;
  routeLabel: string;
  routeIcon: string | null;
  displayOrder: number;
  showOnSideMenu: boolean;
  parentRouteId: string | null;
  permissions: RoutePermission[];
}

const categoryLabels: Record<string, string> = {
  DEALS: 'Deal Management',
  REPORTS: 'Reports & Analytics',
  USERS: 'User Management',
  SETTINGS: 'Settings',
  ADMIN: 'Admin',
};

const iconMap: Record<string, React.ReactNode> = {
  'layout-dashboard': <LayoutDashboard size={18} />,
  'file-text': <FileText size={18} />,
  'bar-chart-3': <BarChart3 size={18} />,
  'settings': <Settings size={18} />,
  'users': <Users size={18} />,
  'shield': <Shield size={18} />,
  'lock': <Lock size={18} />,
  'building': <Lock size={18} />,
  'link': <Lock size={18} />,
  'key': <Key size={18} />,
};

export default function RolesPage() {
  const { currentContext } = useContext(SessionContext);
  const [roles, setRoles] = useState<Role[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<AvailablePermission[]>([]);
  const [allRoutes, setAllRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    designationName: '',
    permissionIds: [] as string[],
  });
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['DEALS', 'REPORTS', 'USERS', 'SETTINGS', 'ADMIN'])
  );

  const companyId = currentContext?.companyId;

  const fetchRoles = async () => {
    if (!companyId) return;
    try {
      const response = await fetch(`/api/roles?companyId=${companyId}`);
      if (!response.ok) throw new Error('Failed to fetch roles');
      const data = await response.json();
      setRoles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailablePermissions = async () => {
    if (!companyId) return;
    try {
      const response = await fetch('/api/permissions');
      if (!response.ok) throw new Error('Failed to fetch permissions');
      const data = await response.json();
      // All permissions are available in simplified model
      const permissions = (data.permissions || []).map((p: Permission) => ({
        ...p,
        isSelected: false,
      }));
      setAvailablePermissions(permissions);
    } catch (err) {
      console.error('Failed to fetch permissions:', err);
    }
  };

  const fetchRoutes = async () => {
    try {
      const response = await fetch('/api/routes');
      if (!response.ok) throw new Error('Failed to fetch routes');
      const data = await response.json();
      setAllRoutes(data);
    } catch (err) {
      console.error('Failed to fetch routes:', err);
    }
  };

  useEffect(() => {
    if (companyId) {
      fetchRoles();
      fetchAvailablePermissions();
      fetchRoutes();
    }
  }, [companyId]);

  const togglePermission = (permissionId: string) => {
    setFormData((prev) => {
      const ids = prev.permissionIds.includes(permissionId)
        ? prev.permissionIds.filter((id) => id !== permissionId)
        : [...prev.permissionIds, permissionId];
      return { ...prev, permissionIds: ids };
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          designationName: formData.designationName,
          permissionIds: formData.permissionIds,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create role');
      }
      await fetchRoles();
      setShowCreateModal(false);
      setFormData({ designationName: '', permissionIds: [] });
      setSuccess('Role created successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create role');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/roles/${editingRole.designationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          designationName: formData.designationName,
          permissionIds: formData.permissionIds,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update role');
      }
      await fetchRoles();
      setShowEditModal(false);
      setEditingRole(null);
      setFormData({ designationName: '', permissionIds: [] });
      setSuccess('Role updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (role: Role) => {
    if (role._count.userAssignments > 0) {
      setError(`Cannot delete "${role.designationName}" - it has ${role._count.userAssignments} user(s) assigned. Reassign users first.`);
      return;
    }
    if (!confirm(`Are you sure you want to delete the role "${role.designationName}"?`)) return;
    try {
      const response = await fetch(`/api/roles/${role.designationId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete role');
      }
      await fetchRoles();
      setSuccess('Role deleted successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete role');
    }
  };

  const openEditModal = (role: Role) => {
    setEditingRole(role);
    setFormData({
      designationName: role.designationName,
      permissionIds: role.permissions.map((p) => p.permission.permissionId),
    });
    setShowEditModal(true);
  };

  const openCreateModal = () => {
    setFormData({ designationName: '', permissionIds: [] });
    setShowCreateModal(true);
  };

  // Group available permissions by category
  const groupedPermissions = availablePermissions.reduce((acc, permission) => {
    const category = permission.permissionCategory;
    if (!acc[category]) acc[category] = [];
    acc[category].push(permission);
    return acc;
  }, {} as Record<string, AvailablePermission[]>);

  // Get permission keys from selected permission IDs
  const selectedPermissionKeys = useMemo(() => {
    return availablePermissions
      .filter((p) => formData.permissionIds.includes(p.permissionId))
      .map((p) => p.permissionKey);
  }, [formData.permissionIds, availablePermissions]);

  // Calculate accessible routes based on selected permissions
  const accessibleRoutes = useMemo(() => {
    return allRoutes.filter((route) => {
      if (!route.showOnSideMenu) return false;
      if (route.permissions.length === 0) return true;
      return route.permissions.some((rp) =>
        selectedPermissionKeys.includes(rp.permission.permissionKey)
      );
    }).sort((a, b) => a.displayOrder - b.displayOrder);
  }, [allRoutes, selectedPermissionKeys]);

  // Group routes by parent for hierarchical display
  const routeTree = useMemo(() => {
    const parentRoutes = accessibleRoutes.filter((r) => !r.parentRouteId);
    const childRoutes = accessibleRoutes.filter((r) => r.parentRouteId);

    return parentRoutes.map((parent) => ({
      ...parent,
      children: childRoutes.filter((c) => c.parentRouteId === parent.routeId),
    }));
  }, [accessibleRoutes]);

  const PermissionSelector = () => (
    <div className="space-y-2 max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
      {Object.entries(groupedPermissions).map(([category, permissions]) => (
        <div key={category} className="border-b last:border-b-0">
          <button
            type="button"
            onClick={() => toggleCategory(category)}
            className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 hover:bg-gray-100 text-left"
          >
            <span className="font-medium text-sm">{categoryLabels[category] || category}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {permissions.filter((p) => formData.permissionIds.includes(p.permissionId)).length}/{permissions.length}
              </span>
              {expandedCategories.has(category) ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
            </div>
          </button>
          {expandedCategories.has(category) && (
            <div className="px-4 py-2 space-y-1 bg-white">
              {permissions.map((permission) => (
                <label
                  key={permission.permissionId}
                  className="flex items-center gap-2 py-1.5 px-2 cursor-pointer hover:bg-blue-50 rounded transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={formData.permissionIds.includes(permission.permissionId)}
                    onChange={() => togglePermission(permission.permissionId)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <code className="text-xs font-medium text-blue-700">{permission.permissionKey}</code>
                    <p className="text-xs text-gray-500 truncate">{permission.permissionDescription}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const MenuPreview = () => (
    <div className="bg-gray-900 rounded-lg p-4 h-full min-h-[300px]">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-700">
        <Menu size={18} className="text-gray-400" />
        <span className="text-sm font-medium text-gray-300">Menu Preview</span>
      </div>

      {accessibleRoutes.length === 0 ? (
        <div className="text-center py-8">
          <Shield className="mx-auto mb-2 text-gray-600" size={24} />
          <p className="text-sm text-gray-500">Select permissions to see menu items</p>
        </div>
      ) : (
        <nav className="space-y-1">
          {routeTree.map((route) => (
            <div key={route.routeId}>
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-800/50 text-gray-200">
                <span className="text-gray-400">
                  {iconMap[route.routeIcon || ''] || <FileText size={18} />}
                </span>
                <span className="text-sm">{route.routeLabel}</span>
              </div>
              {route.children && route.children.length > 0 && (
                <div className="ml-6 mt-1 space-y-1">
                  {route.children.map((child) => (
                    <div
                      key={child.routeId}
                      className="flex items-center gap-3 px-3 py-1.5 rounded text-gray-400 text-sm"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-600"></span>
                      <span>{child.routeLabel}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      )}

      <div className="mt-4 pt-3 border-t border-gray-700">
        <p className="text-xs text-gray-500">
          {accessibleRoutes.length} menu item{accessibleRoutes.length !== 1 ? 's' : ''} visible
        </p>
      </div>
    </div>
  );

  const RoleFormContent = ({ onSubmit, isEdit }: { onSubmit: (e: React.FormEvent) => void; isEdit?: boolean }) => (
    <form onSubmit={onSubmit} className="h-full flex flex-col">
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Role Name</label>
        <input
          type="text"
          value={formData.designationName}
          onChange={(e) => setFormData({ ...formData, designationName: e.target.value })}
          className={inputClassName}
          placeholder="e.g., Sales Manager, Buyer, Admin"
          required
        />
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
        {/* Left: Permission Selector */}
        <div className="flex flex-col min-h-0">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Permissions ({formData.permissionIds.length} selected)
          </label>
          <div className="flex-1 overflow-hidden">
            <PermissionSelector />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Only permissions granted to your company are shown.
          </p>
        </div>

        {/* Right: Menu Preview */}
        <div className="flex flex-col min-h-0">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sidebar Preview
          </label>
          <div className="flex-1 overflow-hidden">
            <MenuPreview />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            This is how the sidebar will look for users with this role.
          </p>
        </div>
      </div>

      <div className="flex gap-3 pt-4 mt-4 border-t">
        <button
          type="button"
          onClick={() => {
            if (isEdit) {
              setShowEditModal(false);
              setEditingRole(null);
            } else {
              setShowCreateModal(false);
            }
          }}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting && <Loader2 className="animate-spin" size={16} />}
          {isEdit ? 'Update Role' : 'Create Role'}
        </button>
      </div>
    </form>
  );

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shield className="text-orange-600" size={32} />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Role Management</h1>
            <p className="text-gray-600">Manage roles and permissions for {currentContext?.companyName}</p>
          </div>
        </div>
        <PermissionGate permission="roles.manage">
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus size={20} />
            Create Role
          </button>
        </PermissionGate>
      </div>

      {/* Messages */}
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

      {/* Roles Grid */}
      {loading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Loader2 className="animate-spin mx-auto mb-2" size={32} />
          <p className="text-gray-600">Loading roles...</p>
        </div>
      ) : roles.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Shield className="mx-auto mb-2 text-gray-400" size={32} />
          <p className="text-gray-500">No roles found. Create your first role to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => (
            <div key={role.designationId} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg text-gray-900">{role.designationName}</h3>
                  <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                    <Users size={14} />
                    <span>{role._count.userAssignments} user(s)</span>
                  </div>
                </div>
                <PermissionGate permission="roles.manage">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(role)}
                      className="p-1 text-gray-400 hover:text-blue-600"
                      title="Edit"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(role)}
                      className="p-1 text-gray-400 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </PermissionGate>
              </div>

              {/* Permission Summary */}
              <div className="border-t pt-4">
                <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
                  <Key size={14} />
                  <span>{role.permissions.length} permission(s)</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {role.permissions.slice(0, 5).map((p) => (
                    <span
                      key={p.permission.permissionId}
                      className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded"
                    >
                      {p.permission.permissionKey}
                    </span>
                  ))}
                  {role.permissions.length > 5 && (
                    <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded">
                      +{role.permissions.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Role Modal - Full width for two-column layout */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Create New Role</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
              <RoleFormContent onSubmit={handleCreate} />
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Modal - Full width for two-column layout */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Edit Role: {editingRole?.designationName}</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingRole(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
              <RoleFormContent onSubmit={handleEdit} isEdit />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
