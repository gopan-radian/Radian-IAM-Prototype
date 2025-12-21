'use client';

import { useContext } from 'react';
import { SessionContext } from '@/contexts/session-context';
import { PermissionGate } from '@/components/permission-gate';
import { Plus } from 'lucide-react';

export default function DealsPage() {
  const { currentContext } = useContext(SessionContext);

  const mockDeals = [
    { id: 1, name: 'Deal #001', supplier: 'Coca-Cola', status: 'Active', amount: '$50,000' },
    { id: 2, name: 'Deal #002', supplier: 'KeHE Distributors', status: 'Pending', amount: '$35,000' },
    { id: 3, name: 'Deal #003', supplier: 'Belvita', status: 'Approved', amount: '$25,000' },
  ];

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Deals</h1>
        <PermissionGate permission="deals.create">
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus size={18} />
            Create Deal
          </button>
        </PermissionGate>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Deal ID</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Supplier</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Amount</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {mockDeals.map((deal) => (
              <tr key={deal.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{deal.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{deal.supplier}</td>
                <td className="px-6 py-4 text-sm">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    deal.status === 'Active' ? 'bg-green-100 text-green-800' :
                    deal.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {deal.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{deal.amount}</td>
                <td className="px-6 py-4 text-right text-sm space-x-2">
                  <PermissionGate permission="deals.edit">
                    <button className="text-blue-600 hover:text-blue-900">Edit</button>
                  </PermissionGate>
                  <PermissionGate permission="deals.approve">
                    <button className="text-green-600 hover:text-green-900">Approve</button>
                  </PermissionGate>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
        ℹ️ This page demonstrates permission-based UI. Buttons like "Create Deal" and "Edit" only appear if you have the required permission.
      </div>
    </div>
  );
}
