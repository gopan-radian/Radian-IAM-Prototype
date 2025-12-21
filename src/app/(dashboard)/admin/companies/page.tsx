'use client';

import { useState, useEffect } from 'react';
import { PermissionGate } from '@/components/permission-gate';
import { Modal } from '@/components/modal';
import {
  AlertCircle, Lock, Building2, Plus, Pencil, Trash2,
  Users, Shield, Link as LinkIcon, Check, X, Loader2
} from 'lucide-react';

const inputClassName = "w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none";

interface Company {
  companyId: string;
  companyName: string;
  companyType: string;
  companyStatus: string;
  isClient: boolean;
  createdAt: string;
  _count: {
    userAssignments: number;
    designations: number;
    availablePermissions: number;
  };
  relationshipsAsFrom: Array<{
    toCompany: { companyId: string; companyName: string; companyType: string };
  }>;
  relationshipsAsTo: Array<{
    fromCompany: { companyId: string; companyName: string; companyType: string };
  }>;
}

const companyTypes = ['MERCHANT', 'SUPPLIER', 'BROKER'] as const;

const typeColors: Record<string, string> = {
  RADIAN: 'bg-purple-100 text-purple-800',
  MERCHANT: 'bg-blue-100 text-blue-800',
  SUPPLIER: 'bg-green-100 text-green-800',
  BROKER: 'bg-orange-100 text-orange-800',
};

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState({
    companyName: '',
    companyType: 'MERCHANT' as string,
    isClient: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/companies');
      if (!response.ok) throw new Error('Failed to fetch companies');
      const data = await response.json();
      setCompanies(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create company');
      }
      await fetchCompanies();
      setShowCreateModal(false);
      setFormData({ companyName: '', companyType: 'MERCHANT', isClient: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create company');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/companies/${editingCompany.companyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update company');
      }
      await fetchCompanies();
      setShowEditModal(false);
      setEditingCompany(null);
      setFormData({ companyName: '', companyType: 'MERCHANT', isClient: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update company');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (company: Company) => {
    if (!confirm(`Are you sure you want to deactivate "${company.companyName}"?`)) return;
    try {
      const response = await fetch(`/api/companies/${company.companyId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete company');
      }
      await fetchCompanies();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete company');
    }
  };

  const openEditModal = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      companyName: company.companyName,
      companyType: company.companyType,
      isClient: company.isClient,
    });
    setShowEditModal(true);
  };

  return (
    <div className="max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Lock className="text-red-600" size={32} />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Companies</h1>
            <p className="text-gray-600">Manage all companies in the platform</p>
          </div>
        </div>
      </div>

      <PermissionGate
        permission="admin.companies"
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
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-gray-900">{companies.length}</div>
            <div className="text-sm text-gray-600">Total Companies</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-blue-600">
              {companies.filter(c => c.companyType === 'MERCHANT').length}
            </div>
            <div className="text-sm text-gray-600">Merchants</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-green-600">
              {companies.filter(c => c.companyType === 'SUPPLIER').length}
            </div>
            <div className="text-sm text-gray-600">Suppliers</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-orange-600">
              {companies.filter(c => c.companyType === 'BROKER').length}
            </div>
            <div className="text-sm text-gray-600">Brokers</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus size={20} />
            Add Company
          </button>
        </div>

        {/* Error message */}
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

        {/* Companies Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="animate-spin mx-auto mb-2" size={32} />
              <p className="text-gray-600">Loading companies...</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stats
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {companies.map((company) => (
                  <tr key={company.companyId} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Building2 className="text-gray-400" size={20} />
                        <div>
                          <div className="font-medium text-gray-900">{company.companyName}</div>
                          <div className="text-xs text-gray-500">
                            Created {new Date(company.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${typeColors[company.companyType]}`}>
                        {company.companyType}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        company.companyStatus === 'ACTIVE'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {company.companyStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {company.isClient ? (
                        <Check className="text-green-600" size={20} />
                      ) : (
                        <X className="text-gray-400" size={20} />
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4 text-xs text-gray-600">
                        <div className="flex items-center gap-1" title="Users">
                          <Users size={14} />
                          <span>{company._count.userAssignments}</span>
                        </div>
                        <div className="flex items-center gap-1" title="Roles">
                          <Shield size={14} />
                          <span>{company._count.designations}</span>
                        </div>
                        <div className="flex items-center gap-1" title="Relationships">
                          <LinkIcon size={14} />
                          <span>{company.relationshipsAsFrom.length + company.relationshipsAsTo.length}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {company.companyType !== 'RADIAN' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(company)}
                            className="p-1 text-gray-400 hover:text-blue-600"
                            title="Edit"
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(company)}
                            className="p-1 text-gray-400 hover:text-red-600"
                            title="Deactivate"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Create Modal */}
        <Modal
          show={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Add New Company"
        >
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className={inputClassName}
                placeholder="Enter company name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Type</label>
              <select
                value={formData.companyType}
                onChange={(e) => setFormData({ ...formData, companyType: e.target.value })}
                className={inputClassName}
              >
                {companyTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isClientCreate"
                checked={formData.isClient}
                onChange={(e) => setFormData({ ...formData, isClient: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="isClientCreate" className="text-sm text-gray-700">
                Is Client (paying customer)
              </label>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
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
                Create Company
              </button>
            </div>
          </form>
        </Modal>

        {/* Edit Modal */}
        <Modal
          show={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingCompany(null);
          }}
          title="Edit Company"
        >
          <form onSubmit={handleEdit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className={inputClassName}
                placeholder="Enter company name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Type</label>
              <select
                value={formData.companyType}
                onChange={(e) => setFormData({ ...formData, companyType: e.target.value })}
                className={inputClassName}
              >
                {companyTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isClientEdit"
                checked={formData.isClient}
                onChange={(e) => setFormData({ ...formData, isClient: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="isClientEdit" className="text-sm text-gray-700">
                Is Client (paying customer)
              </label>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingCompany(null);
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
                Update Company
              </button>
            </div>
          </form>
        </Modal>
      </PermissionGate>
    </div>
  );
}
