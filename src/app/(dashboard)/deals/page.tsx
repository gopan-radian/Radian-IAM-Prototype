'use client';

import { useState, useEffect, useContext } from 'react';
import { SessionContext } from '@/contexts/session-context';
import { PermissionGate } from '@/components/permission-gate';
import { Modal } from '@/components/modal';
import {
  Plus, FileText, Clock, CheckCircle, XCircle, AlertTriangle,
  Loader2, Eye, Pencil, Send, RotateCcw, ThumbsUp, ThumbsDown,
  MessageSquare, Building2, History
} from 'lucide-react';

const inputClassName = "w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none";

interface Deal {
  dealId: string;
  dealNumber: string;
  dealTitle: string;
  dealDescription: string | null;
  dealAmount: string | null;
  dealCurrency: string;
  dealStatus: string;
  ownerCompanyId: string;
  counterpartyCompanyId: string;
  companyRelationshipId: string;
  createdAt: string;
  updatedAt: string;
  dealType: {
    dealTypeId: string;
    dealTypeName: string;
  };
  currentPhase: {
    dealPhaseId: string;
    phaseName: string;
    phaseDescription: string;
  };
  ownerCompany?: {
    companyId: string;
    companyName: string;
    companyType: string;
  };
  counterpartyCompany?: {
    companyId: string;
    companyName: string;
    companyType: string;
  };
  isOwner: boolean;
  availableActions: string[];
  history?: Array<{
    dealHistoryId: string;
    actionType: string;
    changeDescription: string;
    createdAt: string;
  }>;
}

interface DealType {
  dealTypeId: string;
  dealTypeName: string;
  dealTypeDescription: string;
  phases: Array<{
    dealPhaseId: string;
    phaseName: string;
    phaseOrder: number;
  }>;
}

interface Relationship {
  companyRelationshipId: string;
  relationshipType: string;
  fromCompany: { companyId: string; companyName: string; companyType: string };
  toCompany: { companyId: string; companyName: string; companyType: string };
}

const phaseConfig: Record<string, { color: string; bg: string; icon: React.ElementType }> = {
  DRAFT: { color: 'text-gray-600', bg: 'bg-gray-100', icon: FileText },
  PENDING_REVIEW: { color: 'text-yellow-600', bg: 'bg-yellow-100', icon: Clock },
  CHANGES_REQUESTED: { color: 'text-orange-600', bg: 'bg-orange-100', icon: AlertTriangle },
  APPROVED: { color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle },
  REJECTED: { color: 'text-red-600', bg: 'bg-red-100', icon: XCircle },
  IN_PROGRESS: { color: 'text-blue-600', bg: 'bg-blue-100', icon: Clock },
  COMPLETED: { color: 'text-green-700', bg: 'bg-green-200', icon: CheckCircle },
};

export default function DealsPage() {
  const { currentContext } = useContext(SessionContext);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [dealTypes, setDealTypes] = useState<DealType[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [actionType, setActionType] = useState<string>('');
  const [actionComment, setActionComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Create form
  const [createForm, setCreateForm] = useState({
    dealTypeId: '',
    companyRelationshipId: '',
    counterpartyCompanyId: '',
    dealTitle: '',
    dealDescription: '',
    dealAmount: '',
  });

  // Fetch deals
  const fetchDeals = async () => {
    if (!currentContext) return;

    try {
      const response = await fetch(
        `/api/deals?companyId=${currentContext.companyId}&companyType=${currentContext.companyType}`
      );
      if (!response.ok) throw new Error('Failed to fetch deals');
      const data = await response.json();
      setDeals(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deals');
    }
  };

  // Fetch deal types
  const fetchDealTypes = async () => {
    try {
      const response = await fetch('/api/deal-types');
      if (!response.ok) throw new Error('Failed to fetch deal types');
      const data = await response.json();
      setDealTypes(data);
    } catch (err) {
      console.error('Error fetching deal types:', err);
    }
  };

  // Fetch relationships for creating deals
  const fetchRelationships = async () => {
    if (!currentContext) return;

    try {
      const response = await fetch('/api/relationships');
      if (!response.ok) throw new Error('Failed to fetch relationships');
      const data = await response.json();

      // Filter to relationships where current company is involved
      const relevantRelationships = data.filter((r: Relationship) =>
        r.fromCompany.companyId === currentContext.companyId ||
        r.toCompany.companyId === currentContext.companyId
      );

      setRelationships(relevantRelationships);
    } catch (err) {
      console.error('Error fetching relationships:', err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchDeals(), fetchDealTypes(), fetchRelationships()]);
      setLoading(false);
    };

    if (currentContext) {
      loadData();
    }
  }, [currentContext]);

  // Create deal
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentContext) return;

    setSubmitting(true);
    try {
      // Find the relationship to get counterparty
      const relationship = relationships.find(
        (r) => r.companyRelationshipId === createForm.companyRelationshipId
      );

      if (!relationship) {
        throw new Error('Please select a valid relationship');
      }

      // Determine counterparty (the other company in the relationship)
      const counterpartyCompanyId =
        relationship.fromCompany.companyId === currentContext.companyId
          ? relationship.toCompany.companyId
          : relationship.fromCompany.companyId;

      const response = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealTypeId: createForm.dealTypeId,
          companyRelationshipId: createForm.companyRelationshipId,
          ownerCompanyId: currentContext.companyId,
          counterpartyCompanyId,
          dealTitle: createForm.dealTitle,
          dealDescription: createForm.dealDescription,
          dealAmount: createForm.dealAmount || null,
          createdByUserId: currentContext.userId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create deal');
      }

      setShowCreateModal(false);
      setCreateForm({
        dealTypeId: '',
        companyRelationshipId: '',
        counterpartyCompanyId: '',
        dealTitle: '',
        dealDescription: '',
        dealAmount: '',
      });
      await fetchDeals();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create deal');
    } finally {
      setSubmitting(false);
    }
  };

  // Execute workflow action
  const handleWorkflowAction = async () => {
    if (!selectedDeal || !currentContext || !actionType) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/deals/${selectedDeal.dealId}/workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType,
          userId: currentContext.userId,
          companyId: currentContext.companyId,
          comment: actionComment,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to execute action');
      }

      setShowActionModal(false);
      setShowViewModal(false);
      setActionComment('');
      await fetchDeals();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute action');
    } finally {
      setSubmitting(false);
    }
  };

  const openActionModal = (deal: Deal, action: string) => {
    setSelectedDeal(deal);
    setActionType(action);
    setActionComment('');
    setShowActionModal(true);
  };

  const getActionLabel = (action: string): string => {
    const labels: Record<string, string> = {
      submit_for_review: 'Submit for Review',
      resubmit: 'Resubmit for Review',
      approve: 'Approve Deal',
      reject: 'Reject Deal',
      request_changes: 'Request Changes',
      complete: 'Mark as Complete',
    };
    return labels[action] || action;
  };

  const getActionButtonStyle = (action: string): string => {
    const styles: Record<string, string> = {
      submit_for_review: 'bg-blue-600 hover:bg-blue-700 text-white',
      resubmit: 'bg-blue-600 hover:bg-blue-700 text-white',
      approve: 'bg-green-600 hover:bg-green-700 text-white',
      reject: 'bg-red-600 hover:bg-red-700 text-white',
      request_changes: 'bg-orange-600 hover:bg-orange-700 text-white',
      complete: 'bg-green-700 hover:bg-green-800 text-white',
    };
    return styles[action] || 'bg-gray-600 hover:bg-gray-700 text-white';
  };

  // Get available merchants for supplier to create deals with
  const getCounterpartyOptions = () => {
    if (!currentContext) return [];

    return relationships.map((r) => {
      const isFrom = r.fromCompany.companyId === currentContext.companyId;
      const counterparty = isFrom ? r.toCompany : r.fromCompany;
      return {
        relationshipId: r.companyRelationshipId,
        companyId: counterparty.companyId,
        companyName: counterparty.companyName,
        companyType: counterparty.companyType,
      };
    });
  };

  if (!currentContext) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  const isSupplier = currentContext.companyType === 'SUPPLIER';
  const isMerchant = currentContext.companyType === 'MERCHANT';

  return (
    <div className="max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Deals</h1>
          <p className="text-gray-600 mt-1">
            {isSupplier && 'Create and manage deals with your merchant partners'}
            {isMerchant && 'Review and approve deals from your suppliers'}
            {!isSupplier && !isMerchant && 'View and manage deals'}
          </p>
        </div>
        <PermissionGate permission="deals.create">
          {isSupplier && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus size={18} />
              Create Deal
            </button>
          )}
        </PermissionGate>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      ) : deals.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <FileText className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No deals found</h3>
          <p className="text-gray-600">
            {isSupplier
              ? 'Create your first deal to get started'
              : 'Deals will appear here when suppliers submit them for review'}
          </p>
        </div>
      ) : (
        /* Deals Table */
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Deal
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  {isSupplier ? 'Merchant' : 'Supplier'}
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Amount
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {deals.map((deal) => {
                const phase = phaseConfig[deal.currentPhase.phaseName] || phaseConfig.DRAFT;
                const PhaseIcon = phase.icon;
                const partnerCompany = deal.isOwner
                  ? deal.counterpartyCompany
                  : deal.ownerCompany;

                return (
                  <tr key={deal.dealId} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{deal.dealNumber}</div>
                      <div className="text-sm text-gray-600 truncate max-w-xs">
                        {deal.dealTitle}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-gray-400" />
                        <span className="text-gray-900">{partnerCompany?.companyName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {deal.dealType.dealTypeName}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${phase.bg} ${phase.color}`}
                      >
                        <PhaseIcon size={14} />
                        {deal.currentPhase.phaseName.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {deal.dealAmount
                        ? `${deal.dealCurrency} ${parseFloat(deal.dealAmount).toLocaleString()}`
                        : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedDeal(deal);
                            setShowViewModal(true);
                          }}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="View details"
                        >
                          <Eye size={18} />
                        </button>

                        {/* Supplier actions */}
                        {deal.availableActions.includes('submit_for_review') && (
                          <PermissionGate permission="deals.edit">
                            <button
                              onClick={() => openActionModal(deal, 'submit_for_review')}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Submit for review"
                            >
                              <Send size={18} />
                            </button>
                          </PermissionGate>
                        )}

                        {deal.availableActions.includes('resubmit') && (
                          <PermissionGate permission="deals.edit">
                            <button
                              onClick={() => openActionModal(deal, 'resubmit')}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Resubmit after changes"
                            >
                              <RotateCcw size={18} />
                            </button>
                          </PermissionGate>
                        )}

                        {deal.availableActions.includes('edit') && (
                          <PermissionGate permission="deals.edit">
                            <button
                              onClick={() => {
                                setSelectedDeal(deal);
                                setShowViewModal(true);
                              }}
                              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Edit deal"
                            >
                              <Pencil size={18} />
                            </button>
                          </PermissionGate>
                        )}

                        {/* Merchant actions */}
                        {deal.availableActions.includes('approve') && (
                          <PermissionGate permission="deals.approve">
                            <button
                              onClick={() => openActionModal(deal, 'approve')}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                              title="Approve deal"
                            >
                              <ThumbsUp size={18} />
                            </button>
                          </PermissionGate>
                        )}

                        {deal.availableActions.includes('reject') && (
                          <PermissionGate permission="deals.approve">
                            <button
                              onClick={() => openActionModal(deal, 'reject')}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              title="Reject deal"
                            >
                              <ThumbsDown size={18} />
                            </button>
                          </PermissionGate>
                        )}

                        {deal.availableActions.includes('request_changes') && (
                          <PermissionGate permission="deals.approve">
                            <button
                              onClick={() => openActionModal(deal, 'request_changes')}
                              className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg"
                              title="Request changes"
                            >
                              <MessageSquare size={18} />
                            </button>
                          </PermissionGate>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Info banner */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
        <strong>How deals work:</strong>
        <ul className="mt-2 space-y-1 list-disc list-inside">
          <li>
            <strong>Suppliers</strong> create deals in DRAFT status and submit for review
          </li>
          <li>
            <strong>Merchants</strong> can approve, reject, or request changes
          </li>
          <li>
            When changes are requested, suppliers edit and resubmit
          </li>
          <li>Deals are scoped to your active company - switch companies to see different deals</li>
        </ul>
      </div>

      {/* Create Deal Modal */}
      <Modal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Deal"
        maxWidth="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {/* Deal Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deal Type
            </label>
            <select
              value={createForm.dealTypeId}
              onChange={(e) => setCreateForm({ ...createForm, dealTypeId: e.target.value })}
              className={inputClassName}
              required
            >
              <option value="">Select deal type...</option>
              {dealTypes.map((type) => (
                <option key={type.dealTypeId} value={type.dealTypeId}>
                  {type.dealTypeName}
                </option>
              ))}
            </select>
          </div>

          {/* Merchant Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Merchant
            </label>
            <select
              value={createForm.companyRelationshipId}
              onChange={(e) => setCreateForm({ ...createForm, companyRelationshipId: e.target.value })}
              className={inputClassName}
              required
            >
              <option value="">Select merchant...</option>
              {getCounterpartyOptions()
                .filter((o) => o.companyType === 'MERCHANT')
                .map((option) => (
                  <option key={option.relationshipId} value={option.relationshipId}>
                    {option.companyName}
                  </option>
                ))}
            </select>
          </div>

          {/* Deal Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deal Title
            </label>
            <input
              type="text"
              value={createForm.dealTitle}
              onChange={(e) => setCreateForm({ ...createForm, dealTitle: e.target.value })}
              className={inputClassName}
              placeholder="e.g., Summer Promotion 2024"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={createForm.dealDescription}
              onChange={(e) => setCreateForm({ ...createForm, dealDescription: e.target.value })}
              className={inputClassName}
              rows={3}
              placeholder="Describe the deal details..."
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount (USD)
            </label>
            <input
              type="number"
              value={createForm.dealAmount}
              onChange={(e) => setCreateForm({ ...createForm, dealAmount: e.target.value })}
              className={inputClassName}
              placeholder="e.g., 50000"
            />
          </div>

          {/* Submit */}
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
              {submitting && <Loader2 className="animate-spin" size={18} />}
              Create Deal
            </button>
          </div>
        </form>
      </Modal>

      {/* View Deal Modal */}
      <Modal
        show={showViewModal}
        onClose={() => setShowViewModal(false)}
        title={selectedDeal ? `${selectedDeal.dealNumber} - ${selectedDeal.dealTitle}` : 'Deal Details'}
        maxWidth="2xl"
      >
        {selectedDeal && (
          <div className="space-y-6">
            {/* Status & Phase */}
            <div className="flex items-center gap-4">
              {(() => {
                const phase = phaseConfig[selectedDeal.currentPhase.phaseName] || phaseConfig.DRAFT;
                const PhaseIcon = phase.icon;
                return (
                  <span
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${phase.bg} ${phase.color}`}
                  >
                    <PhaseIcon size={18} />
                    {selectedDeal.currentPhase.phaseName.replace(/_/g, ' ')}
                  </span>
                );
              })()}
              <span className="text-sm text-gray-600">
                {selectedDeal.currentPhase.phaseDescription}
              </span>
            </div>

            {/* Deal Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Type</label>
                <p className="text-gray-900">{selectedDeal.dealType.dealTypeName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Amount</label>
                <p className="text-gray-900 font-medium">
                  {selectedDeal.dealAmount
                    ? `${selectedDeal.dealCurrency} ${parseFloat(selectedDeal.dealAmount).toLocaleString()}`
                    : '-'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">
                  {selectedDeal.isOwner ? 'Merchant' : 'Supplier'}
                </label>
                <p className="text-gray-900">
                  {selectedDeal.isOwner
                    ? selectedDeal.counterpartyCompany?.companyName
                    : selectedDeal.ownerCompany?.companyName}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Created</label>
                <p className="text-gray-900">
                  {new Date(selectedDeal.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Description */}
            {selectedDeal.dealDescription && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Description
                </label>
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">
                  {selectedDeal.dealDescription}
                </p>
              </div>
            )}

            {/* History */}
            {selectedDeal.history && selectedDeal.history.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                  <History size={16} />
                  Recent History
                </label>
                <div className="space-y-2">
                  {selectedDeal.history.slice(0, 5).map((h) => (
                    <div
                      key={h.dealHistoryId}
                      className="flex items-start gap-3 text-sm bg-gray-50 p-2 rounded"
                    >
                      <span className="text-gray-400 text-xs whitespace-nowrap">
                        {new Date(h.createdAt).toLocaleString()}
                      </span>
                      <span className="text-gray-700">{h.changeDescription}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available Actions */}
            {selectedDeal.availableActions.filter((a) => a !== 'view').length > 0 && (
              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-500 mb-3">
                  Available Actions
                </label>
                <div className="flex flex-wrap gap-2">
                  {selectedDeal.availableActions
                    .filter((a) => a !== 'view' && a !== 'edit' && a !== 'delete')
                    .map((action) => (
                      <button
                        key={action}
                        onClick={() => openActionModal(selectedDeal, action)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium ${getActionButtonStyle(action)}`}
                      >
                        {getActionLabel(action)}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Action Confirmation Modal */}
      <Modal
        show={showActionModal}
        onClose={() => setShowActionModal(false)}
        title={getActionLabel(actionType)}
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            {actionType === 'submit_for_review' &&
              'Submit this deal for merchant review. The merchant will be notified.'}
            {actionType === 'resubmit' &&
              'Resubmit this deal after making the requested changes.'}
            {actionType === 'approve' &&
              'Approve this deal. The supplier will be notified of the approval.'}
            {actionType === 'reject' &&
              'Reject this deal. Please provide a reason for the rejection.'}
            {actionType === 'request_changes' &&
              'Request changes to this deal. Please describe what changes are needed.'}
          </p>

          {(actionType === 'reject' || actionType === 'request_changes') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {actionType === 'reject' ? 'Reason for rejection' : 'Changes needed'}
              </label>
              <textarea
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
                className={inputClassName}
                rows={3}
                placeholder={
                  actionType === 'reject'
                    ? 'Explain why this deal is being rejected...'
                    : 'Describe the changes you need the supplier to make...'
                }
                required
              />
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowActionModal(false)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleWorkflowAction}
              disabled={
                submitting ||
                ((actionType === 'reject' || actionType === 'request_changes') &&
                  !actionComment.trim())
              }
              className={`flex-1 py-2 px-4 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2 ${getActionButtonStyle(actionType)}`}
            >
              {submitting && <Loader2 className="animate-spin" size={18} />}
              {getActionLabel(actionType)}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
