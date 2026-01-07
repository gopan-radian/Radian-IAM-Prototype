'use client';

import { useContext } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SessionContext } from '@/contexts/session-context';
import {
  Home,
  FileText,
  BarChart,
  Settings,
  Users,
  Shield,
  Building,
  Key,
  Link as LinkIcon,
  Download,
  Plus,
} from 'lucide-react';

const iconMap: Record<string, any> = {
  home: Home,
  'file-text': FileText,
  'bar-chart': BarChart,
  settings: Settings,
  users: Users,
  shield: Shield,
  building: Building,
  key: Key,
  link: LinkIcon,
  download: Download,
  plus: Plus,
};

export function Sidebar() {
  const { accessibleRoutes, currentContext } = useContext(SessionContext);
  const pathname = usePathname();

  // Filter to only top-level routes that should show on menu
  const menuRoutes = accessibleRoutes.filter((r) => r.showOnSideMenu && !r.parentRouteId);

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen p-4 overflow-y-auto">
      {/* Company Context Display */}
      <div className="mb-6 p-3 bg-gray-800 rounded-lg">
        <p className="text-xs text-gray-400">Current Context</p>
        <p className="font-semibold text-sm">{currentContext?.companyName}</p>
        {currentContext?.relationshipName && (
          <p className="text-xs text-gray-300 mt-1">{currentContext.relationshipName}</p>
        )}
        <p className="text-xs text-gray-400 mt-2">{currentContext?.designationName}</p>
      </div>

      {/* Navigation */}
      <nav className="space-y-1 mb-8">
        {menuRoutes.map((route) => {
          const Icon = iconMap[route.routeIcon || 'home'];
          const isActive = pathname === route.routePath;

          return (
            <Link
              key={route.routeId}
              href={route.routePath}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm ${
                isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              {Icon && <Icon size={18} />}
              <span>{route.routeLabel}</span>
            </Link>
          );
        })}
      </nav>

    </aside>
  );
}
