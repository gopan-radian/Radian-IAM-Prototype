'use client';

import { useContext } from 'react';
import { SessionContext } from '@/contexts/session-context';
import { BarChart3, Users, Lock } from 'lucide-react';

export default function DashboardPage() {
  const { currentContext } = useContext(SessionContext);

  return (
    <div className="max-w-6xl">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg p-8 mb-8">
        <h1 className="text-4xl font-bold mb-2">Welcome to Radian Platform</h1>
        <p className="text-blue-100">Multi-tenant retail platform with role-based access control</p>
      </div>

      {/* Current Context */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">Current Company</h3>
          <p className="text-2xl font-bold text-gray-900">{currentContext?.companyName}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-600">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">Your Role</h3>
          <p className="text-2xl font-bold text-gray-900">{currentContext?.designationName}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-600">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">Permissions</h3>
          <p className="text-2xl font-bold text-gray-900">{currentContext?.permissions.length}</p>
        </div>
      </div>

      {/* Info Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Your Permissions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Lock size={20} className="text-blue-600" />
            Your Permissions
          </h2>
          <div className="space-y-2">
            {currentContext?.permissions && currentContext.permissions.length > 0 ? (
              currentContext.permissions.map((permission) => (
                <div key={permission} className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200">
                  <span className="text-green-600">✓</span>
                  <code className="text-sm font-mono text-green-900">{permission}</code>
                </div>
              ))
            ) : (
              <p className="text-gray-500">No permissions assigned</p>
            )}
          </div>
        </div>

        {/* Context Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 size={20} className="text-purple-600" />
            Context Information
          </h2>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-gray-600 font-semibold">Company:</span>
              <p className="text-gray-900">{currentContext?.companyName}</p>
            </div>
            <div>
              <span className="text-gray-600 font-semibold">Role:</span>
              <p className="text-gray-900">{currentContext?.designationName}</p>
            </div>
            {currentContext?.relationshipName && (
              <div>
                <span className="text-gray-600 font-semibold">Relationship Scope:</span>
                <p className="text-gray-900">{currentContext.relationshipName}</p>
              </div>
            )}
            <div>
              <span className="text-gray-600 font-semibold">Total Permissions:</span>
              <p className="text-gray-900">{currentContext?.permissions.length || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">ℹ️ About Radian Platform</h3>
        <p className="text-blue-800 text-sm">
          This is a multi-tenant SaaS platform demonstrating role-based access control. Different users see different menus based on their permissions. Use the context switcher to try different roles and see how permissions change dynamically.
        </p>
      </div>
    </div>
  );
}
