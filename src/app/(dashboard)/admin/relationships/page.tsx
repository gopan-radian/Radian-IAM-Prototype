'use client';

import { useState, useEffect } from 'react';
import { PermissionGate } from '@/components/permission-gate';
import { Modal } from '@/components/modal';
import {
  AlertCircle, Lock, Link as LinkIcon, Plus, Trash2,
  Users, ArrowRight, Loader2, X, Building2
} from 'lucide-react';

const inputClassName = "w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none";

interface Company {
  companyId: string;
  companyName: string;
  companyType: string;
}

interface Relationship {
  companyRelationshipId: string;
  fromCompanyId: string;
  toCompanyId: string;
  relationshipType: string;
  relationshipStatus: string;
  createdAt: string;
  fromCompany: Company;
  toCompany: Company;
  _count: {
    userAssignments: number;
  };
}

const relationshipTypes = [
  { value: 'MERCHANT_SUPPLIER', label: 'Merchant ↔ Supplier', fromType: 'MERCHANT', toType: 'SUPPLIER' },
  { value: 'BROKER_SUPPLIER', label: 'Broker ↔ Supplier', fromType: 'BROKER', toType: 'SUPPLIER' },
  { value: 'PARTNER', label: 'Partner', fromType: null, toType: null },
];

const typeColors: Record<string, string> = {
  MERCHANT_SUPPLIER: 'bg-blue-100 text-blue-800',
  BROKER_SUPPLIER: 'bg-orange-100 text-orange-800',
  PARTNER: 'bg-green-100 text-green-800',
};

export default function RelationshipsPage() {
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fromCompanyId: '',
    toCompanyId: '',
    relationshipType: 'MERCHANT_SUPPLIER',
  });

  const fetchRelationships = async () => {
    try {
      const response = await fetch('/api/relationships');
      if (!response.ok) throw new Error('Failed to fetch relationships');
      const data = await response.json();
      setRelationships(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/companies');
      if (!response.ok) throw new Error('Failed to fetch companies');
      const data = await response.json();
      // Filter out Radian
      setCompanies(data.filter((c: Company) => c.companyType !== 'RADIAN'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load companies');
    }
  };

  useEffect(() => {
    fetchRelationships();
    fetchCompanies();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create relationship');
      }
      await fetchRelationships();
      setShowCreateModal(false);
      setFormData({ fromCompanyId: '', toCompanyId: '', relationshipType: 'MERCHANT_SUPPLIER' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create relationship');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (relationship: Relationship) => {
    const confirmMsg = relationship._count.userAssignments > 0
      ? `This relationship has ${relationship._count.userAssignments} user assignment(s). Deactivating will also deactivate those assignments. Continue?`
      : `Are you sure you want to deactivate the relationship between "${relationship.fromCompany.companyName}" and "${relationship.toCompany.companyName}"?`;

    if (!confirm(confirmMsg)) return;

    try {
      const response = await fetch(`/api/relationships/${relationship.companyRelationshipId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete relationship');
      }
      await fetchRelationships();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete relationship');
    }
  };

  const handleToggleStatus = async (relationship: Relationship) => {
    const newStatus = relationship.relationshipStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const response = await fetch(`/api/relationships/${relationship.companyRelationshipId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ relationshipStatus: newStatus }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update relationship');
      }
      await fetchRelationships();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update relationship');
    }
  };

  // Filter companies based on selected relationship type
  const selectedType = relationshipTypes.find((t) => t.value === formData.relationshipType);
  const fromCompanies = companies.filter((c) =>
    !selectedType?.fromType || c.companyType === selectedType.fromType
  );
  const toCompanies = companies.filter((c) =>
    !selectedType?.toType || c.companyType === selectedType.toType
  );

  return (
    <div className="max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Lock className="text-red-600" size={32} />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Relationships</h1>
            <p className="text-gray-600">Manage B2B relationships between companies</p>
          </div>
        </div>
      </div>

      <PermissionGate
        permission="admin.relationships"
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
            <div className="text-2xl font-bold text-gray-900">{relationships.length}</div>
            <div className="text-sm text-gray-600">Total Relationships</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-blue-600">
              {relationships.filter((r) => r.relationshipType === 'MERCHANT_SUPPLIER').length}
            </div>
            <div className="text-sm text-gray-600">Merchant-Supplier</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-orange-600">
              {relationships.filter((r) => r.relationshipType === 'BROKER_SUPPLIER').length}
            </div>
            <div className="text-sm text-gray-600">Broker-Supplier</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-green-600">
              {relationships.filter((r) => r.relationshipStatus === 'ACTIVE').length}
            </div>
            <div className="text-sm text-gray-600">Active</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus size={20} />
            Add Relationship
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

        {/* Relationships List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="animate-spin mx-auto mb-2" size={32} />
              <p className="text-gray-600">Loading relationships...</p>
            </div>
          ) : relationships.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <LinkIcon className="mx-auto mb-2 text-gray-400" size={32} />
              <p>No relationships found. Create one to get started.</p>
            </div>
          ) : (
            <div className="divide-y">
              {relationships.map((relationship) => (
                <div
                  key={relationship.companyRelationshipId}
                  className="p-4 hover:bg-gray-50 flex items-center justify-between"
                >
                  {/* Relationship Details */}
                  <div className="flex items-center gap-4">
                    {/* From Company */}
                    <div className="flex items-center gap-2 min-w-[180px]">
                      <Building2 className="text-gray-400" size={20} />
                      <div>
                        <div className="font-medium text-gray-900">{relationship.fromCompany.companyName}</div>
                        <div className="text-xs text-gray-500">{relationship.fromCompany.companyType}</div>
                      </div>
                    </div>

                    {/* Arrow */}
                    <ArrowRight className="text-gray-400" size={20} />

                    {/* To Company */}
                    <div className="flex items-center gap-2 min-w-[180px]">
                      <Building2 className="text-gray-400" size={20} />
                      <div>
                        <div className="font-medium text-gray-900">{relationship.toCompany.companyName}</div>
                        <div className="text-xs text-gray-500">{relationship.toCompany.companyType}</div>
                      </div>
                    </div>

                    {/* Type Badge */}
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${typeColors[relationship.relationshipType]}`}>
                      {relationship.relationshipType.replace('_', ' ')}
                    </span>

                    {/* Status Badge */}
                    <button
                      onClick={() => handleToggleStatus(relationship)}
                      className={`px-2 py-1 text-xs font-medium rounded-full cursor-pointer ${
                        relationship.relationshipStatus === 'ACTIVE'
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }`}
                    >
                      {relationship.relationshipStatus}
                    </button>

                    {/* User Count */}
                    <div className="flex items-center gap-1 text-sm text-gray-500" title="Users assigned">
                      <Users size={16} />
                      <span>{relationship._count.userAssignments}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDelete(relationship)}
                      className="p-1 text-gray-400 hover:text-red-600"
                      title="Deactivate"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Modal */}
        <Modal
          show={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Create New Relationship"
          maxWidth="lg"
        >
          <form onSubmit={handleCreate} className="space-y-4">
            {/* Relationship Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Relationship Type
              </label>
              <select
                value={formData.relationshipType}
                onChange={(e) => setFormData({
                  ...formData,
                  relationshipType: e.target.value,
                  fromCompanyId: '',
                  toCompanyId: '',
                })}
                className={inputClassName}
              >
                {relationshipTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* From Company */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Company {selectedType?.fromType && `(${selectedType.fromType})`}
              </label>
              <select
                value={formData.fromCompanyId}
                onChange={(e) => setFormData({ ...formData, fromCompanyId: e.target.value })}
                className={inputClassName}
                required
              >
                <option value="">Select company...</option>
                {fromCompanies.map((company) => (
                  <option key={company.companyId} value={company.companyId}>
                    {company.companyName} ({company.companyType})
                  </option>
                ))}
              </select>
            </div>

            {/* To Company */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To Company {selectedType?.toType && `(${selectedType.toType})`}
              </label>
              <select
                value={formData.toCompanyId}
                onChange={(e) => setFormData({ ...formData, toCompanyId: e.target.value })}
                className={inputClassName}
                required
              >
                <option value="">Select company...</option>
                {toCompanies
                  .filter((c) => c.companyId !== formData.fromCompanyId)
                  .map((company) => (
                    <option key={company.companyId} value={company.companyId}>
                      {company.companyName} ({company.companyType})
                    </option>
                  ))}
              </select>
            </div>

            {/* Submit Button */}
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
                Create Relationship
              </button>
            </div>
          </form>
        </Modal>
      </PermissionGate>
    </div>
  );
}
