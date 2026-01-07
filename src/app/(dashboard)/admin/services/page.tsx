'use client';

import { useState, useEffect } from 'react';
import { PermissionGate } from '@/components/permission-gate';
import {
  AlertCircle, Lock, Building2, Check, X,
  Loader2, ChevronDown, ChevronRight, Server
} from 'lucide-react';

interface Service {
  serviceId: string;
  serviceKey: string;
  serviceName: string;
  serviceDescription: string;
  isEnabled: boolean;
}

interface Company {
  companyId: string;
  companyName: string;
  companyType: string;
  companyStatus: string;
}

export default function CompanyServicesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch companies on mount
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await fetch('/api/companies');
        if (!response.ok) throw new Error('Failed to fetch companies');
        const data = await response.json();
        // Filter out Radian company (has all services by default)
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

  // Fetch services when company is selected
  useEffect(() => {
    if (!selectedCompanyId) {
      setServices([]);
      return;
    }

    const fetchServices = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/services?companyId=${selectedCompanyId}`);
        if (!response.ok) throw new Error('Failed to fetch services');
        const data = await response.json();
        setServices(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load services');
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, [selectedCompanyId]);

  const toggleService = async (serviceId: string, currentState: boolean) => {
    setSaving(serviceId);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: selectedCompanyId,
          serviceId,
          isEnabled: !currentState,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update service');
      }

      // Update local state
      setServices((prev) =>
        prev.map((s) =>
          s.serviceId === serviceId ? { ...s, isEnabled: !currentState } : s
        )
      );

      const serviceName = services.find((s) => s.serviceId === serviceId)?.serviceName;
      setSuccess(`${serviceName} ${!currentState ? 'enabled' : 'disabled'} successfully`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update service');
    } finally {
      setSaving(null);
    }
  };

  const selectedCompany = companies.find((c) => c.companyId === selectedCompanyId);
  const enabledCount = services.filter((s) => s.isEnabled).length;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Server className="text-blue-600" size={32} />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Company Services</h1>
            <p className="text-gray-600">Control which services each company can access</p>
          </div>
        </div>
      </div>

      <PermissionGate
        permission="admin.services"
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

        {/* Services List */}
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
                  <div className="text-2xl font-bold text-green-600">{enabledCount}</div>
                  <div className="text-xs text-gray-500">Enabled</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-400">{services.length - enabledCount}</div>
                  <div className="text-xs text-gray-500">Disabled</div>
                </div>
              </div>
            </div>

            {/* Loading State */}
            {loading ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <Loader2 className="animate-spin mx-auto mb-2" size={32} />
                <p className="text-gray-600">Loading services...</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {services.map((service) => (
                    <div
                      key={service.serviceId}
                      className="flex items-center justify-between px-6 py-4 hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          service.isEnabled ? 'bg-blue-100' : 'bg-gray-100'
                        }`}>
                          <Server size={20} className={service.isEnabled ? 'text-blue-600' : 'text-gray-400'} />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{service.serviceName}</h4>
                          <p className="text-sm text-gray-500">{service.serviceDescription}</p>
                          <code className="text-xs text-gray-400 font-mono">{service.serviceKey}</code>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleService(service.serviceId, service.isEnabled)}
                        disabled={saving === service.serviceId}
                        className={`relative w-14 h-7 rounded-full transition-colors ${
                          service.isEnabled ? 'bg-green-500' : 'bg-gray-300'
                        } ${saving === service.serviceId ? 'opacity-50 cursor-wait' : ''}`}
                      >
                        {saving === service.serviceId ? (
                          <Loader2 className="animate-spin absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white" size={16} />
                        ) : (
                          <div
                            className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                              service.isEnabled ? 'translate-x-8' : 'translate-x-1'
                            }`}
                          />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
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
              Choose a company from the dropdown above to manage their available services.
              Services determine which features and apps the company's users can access.
            </p>
          </div>
        )}
      </PermissionGate>
    </div>
  );
}
