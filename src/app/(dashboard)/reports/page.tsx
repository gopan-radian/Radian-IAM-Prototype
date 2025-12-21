'use client';

import { PermissionGate } from '@/components/permission-gate';
import { Download } from 'lucide-react';

export default function ReportsPage() {
  const mockReports = [
    { id: 1, name: 'Monthly Sales Report', type: 'PDF', date: '2024-12-01' },
    { id: 2, name: 'Supplier Performance', type: 'CSV', date: '2024-11-30' },
    { id: 3, name: 'Deal Analytics', type: 'PDF', date: '2024-11-28' },
  ];

  return (
    <div className="max-w-6xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Reports</h1>

      <div className="space-y-4">
        {mockReports.map((report) => (
          <div key={report.id} className="bg-white rounded-lg shadow p-6 flex items-center justify-between hover:shadow-lg transition-shadow">
            <div>
              <h3 className="font-semibold text-gray-900">{report.name}</h3>
              <p className="text-sm text-gray-600">{report.type} • {report.date}</p>
            </div>
            <PermissionGate permission="reports.export">
              <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                <Download size={18} />
                Export
              </button>
            </PermissionGate>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
        ℹ️ The "Export" button is only visible if you have the <code className="bg-blue-100 px-2 py-1 rounded">reports.export</code> permission.
      </div>
    </div>
  );
}
