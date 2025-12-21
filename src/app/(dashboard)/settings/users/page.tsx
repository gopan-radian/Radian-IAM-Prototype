'use client';

import { useState, useEffect, useContext } from 'react';
import { PermissionGate } from '@/components/permission-gate';
import { Modal } from '@/components/modal';
import { SessionContext } from '@/contexts/session-context';
import {
  AlertCircle, Users, UserPlus, Pencil, Trash2,
  Loader2, X, Mail, Phone, Shield, Building2
} from 'lucide-react';

const inputClassName = "w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none";

interface Designation {
  designationId: string;
  designationName: string;
}

interface CompanyRelationship {
  companyRelationshipId: string;
  fromCompany: { companyName: string };
  toCompany: { companyName: string };
}

interface CompanyAssignment {
  userCompanyAssignmentId: string;
  company: {
    companyId: string;
    companyName: string;
    companyType: string;
  };
  designation: Designation;
  companyRelationship?: CompanyRelationship | null;
}

interface User {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  status: string;
  createdAt: string;
  companyAssignments: CompanyAssignment[];
}

export default function UsersPage() {
  const { currentContext } = useContext(SessionContext);
  const [users, setUsers] = useState<User[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [relationships, setRelationships] = useState<CompanyRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    designationId: '',
    companyRelationshipId: '',
  });

  const companyId = currentContext?.companyId;

  const fetchUsers = async () => {
    if (!companyId) return;
    try {
      const response = await fetch(`/api/users?companyId=${companyId}`);
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchDesignations = async () => {
    if (!companyId) return;
    try {
      const response = await fetch(`/api/roles?companyId=${companyId}`);
      if (!response.ok) throw new Error('Failed to fetch roles');
      const data = await response.json();
      setDesignations(data);
    } catch (err) {
      console.error('Failed to fetch designations:', err);
    }
  };

  const fetchRelationships = async () => {
    try {
      const response = await fetch('/api/relationships');
      if (!response.ok) throw new Error('Failed to fetch relationships');
      const data = await response.json();
      // Filter relationships involving current company
      const filtered = data.filter((r: { fromCompanyId: string; toCompanyId: string }) =>
        r.fromCompanyId === companyId || r.toCompanyId === companyId
      );
      setRelationships(filtered);
    } catch (err) {
      console.error('Failed to fetch relationships:', err);
    }
  };

  useEffect(() => {
    if (companyId) {
      fetchUsers();
      fetchDesignations();
      fetchRelationships();
    }
  }, [companyId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          companyId,
          companyRelationshipId: formData.companyRelationshipId || null,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create user');
      }
      await fetchUsers();
      setShowInviteModal(false);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        phone: '',
        designationId: '',
        companyRelationshipId: '',
      });
      setSuccess('User invited successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/users/${editingUser.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update user');
      }
      await fetchUsers();
      setShowEditModal(false);
      setEditingUser(null);
      setSuccess('User updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Are you sure you want to deactivate "${user.firstName} ${user.lastName}"?`)) return;
    try {
      const response = await fetch(`/api/users/${user.userId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to deactivate user');
      }
      await fetchUsers();
      setSuccess('User deactivated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate user');
    }
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: '',
      phone: user.phone || '',
      designationId: '',
      companyRelationshipId: '',
    });
    setShowEditModal(true);
  };

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="text-purple-600" size={32} />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600">Manage users in {currentContext?.companyName}</p>
          </div>
        </div>
        <PermissionGate permission="users.invite">
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <UserPlus size={20} />
            Invite User
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
            <span>{success}</span>
            <button onClick={() => setSuccess(null)} className="ml-auto">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="animate-spin mx-auto mb-2" size={32} />
            <p className="text-gray-600">Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Users className="mx-auto mb-2 text-gray-400" size={32} />
            <p>No users found in this company.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => {
                const assignment = user.companyAssignments.find(
                  (a) => a.company.companyId === companyId
                );
                return (
                  <tr key={user.userId} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-sm text-gray-500">
                        Joined {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Mail size={14} />
                        <span>{user.email}</span>
                      </div>
                      {user.phone && (
                        <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                          <Phone size={14} />
                          <span>{user.phone}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {assignment && (
                        <div>
                          <div className="flex items-center gap-1">
                            <Shield size={14} className="text-gray-400" />
                            <span className="font-medium">{assignment.designation.designationName}</span>
                          </div>
                          {assignment.companyRelationship && (
                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                              <Building2 size={12} />
                              <span>
                                {assignment.companyRelationship.fromCompany.companyName} ↔{' '}
                                {assignment.companyRelationship.toCompany.companyName}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          user.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <PermissionGate permission="users.manage">
                          <button
                            onClick={() => openEditModal(user)}
                            className="p-1 text-gray-400 hover:text-blue-600"
                            title="Edit"
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(user)}
                            className="p-1 text-gray-400 hover:text-red-600"
                            title="Deactivate"
                          >
                            <Trash2 size={18} />
                          </button>
                        </PermissionGate>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Invite User Modal */}
      <Modal
        show={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Invite New User"
      >
        <form onSubmit={handleInvite} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className={inputClassName}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className={inputClassName}
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={inputClassName}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className={inputClassName}
              placeholder="Temporary password"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className={inputClassName}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={formData.designationId}
              onChange={(e) => setFormData({ ...formData, designationId: e.target.value })}
              className={inputClassName}
              required
            >
              <option value="">Select a role...</option>
              {designations.map((d) => (
                <option key={d.designationId} value={d.designationId}>
                  {d.designationName}
                </option>
              ))}
            </select>
          </div>
          {relationships.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Relationship Scope (optional)
              </label>
              <select
                value={formData.companyRelationshipId}
                onChange={(e) => setFormData({ ...formData, companyRelationshipId: e.target.value })}
                className={inputClassName}
              >
                <option value="">All relationships</option>
                {relationships.map((r) => (
                  <option key={r.companyRelationshipId} value={r.companyRelationshipId}>
                    {r.fromCompany.companyName} ↔ {r.toCompany.companyName}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowInviteModal(false)}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="animate-spin" size={16} />}
              Invite User
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        show={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingUser(null);
        }}
        title="Edit User"
      >
        <form onSubmit={handleEdit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className={inputClassName}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className={inputClassName}
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={inputClassName}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className={inputClassName}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowEditModal(false);
                setEditingUser(null);
              }}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="animate-spin" size={16} />}
              Update User
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
