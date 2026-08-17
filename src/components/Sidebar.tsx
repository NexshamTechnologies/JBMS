import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  Users,
  BarChart3,
  Sparkles,
  ChevronRight,
  CreditCard,
  Database,
  ShieldCheck
} from 'lucide-react';
import { UserRole, ROLE_PERMISSIONS } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  unpaidInvoicesCount: number;
  userRole: UserRole;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  unpaidInvoicesCount,
  userRole
}) => {
  const allowedTabs = ROLE_PERMISSIONS[userRole] || ROLE_PERMISSIONS.Owner;

  const allNavItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'billing',
      label: 'Billing',
      icon: ShoppingCart,
      badge: unpaidInvoicesCount > 0 ? unpaidInvoicesCount : null,
      badgeColor: 'bg-rose-500 text-white'
    },
    {
      id: 'product-catalog',
      label: 'Product Catalog',
      icon: Boxes,
      badge: null
    },
    {
      id: 'customer-ledger',
      label: 'Customer Ledger',
      icon: Users,
      badge: null
    },
    {
      id: 'customers',
      label: 'Customers',
      icon: Users,
      badge: null
    },
    {
      id: 'payments',
      label: 'Payments',
      icon: CreditCard,
      badge: null
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Sparkles,
      badge: null
    },
    {
      id: 'backup',
      label: 'Backup & Restore',
      icon: Database,
      badge: null
    },
    {
      id: 'analytics',
      label: 'Reports & Analytics',
      icon: BarChart3,
      badge: null
    }
  ];

  // Filter sidebar items based on UserRole RBAC rules
  const visibleNavItems = allNavItems.filter((item) => allowedTabs.includes(item.id));

  return (
    <aside className="w-full lg:w-64 bg-[#0a0a0a] border-r border-white/10 flex-shrink-0 flex flex-col justify-between select-none">
      <div className="p-3 lg:p-4 space-y-1">
        <div className="px-3 py-2 flex items-center justify-between">
          <span className="text-[10px] font-bold tracking-[0.25em] text-blue-600 dark:text-blue-400 uppercase">
            Management Modules
          </span>
          <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-white/10 text-white uppercase tracking-wider">
            {userRole}
          </span>
        </div>

        <nav className="space-y-1">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-full text-xs uppercase tracking-widest font-semibold transition-all group ${isActive
                    ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/20'
                    : 'text-[#d1d1d1]/70 hover:bg-white/5 hover:text-white'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${isActive ? 'text-white' : 'text-[#d1d1d1]/40 group-hover:text-blue-500'
                      }`}
                  />
                  <span>{item.label}</span>
                </div>

                <div className="flex items-center gap-2">
                  {item.badge !== null && (
                    <span
                      className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${isActive
                          ? 'bg-white/20 text-white'
                          : item.badgeColor || 'bg-[#1a1a1a] text-[#d1d1d1]'
                        }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-white" />}
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Quick Role & System Summary Box */}
      <div className="p-4 border-t border-white/10 hidden lg:block">
        <div className="bg-[#141414] rounded-2xl p-4 border border-white/10 text-xs space-y-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">Role Access</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#d1d1d1]/60 text-[11px]">Active Role</span>
            <span className="font-bold text-white">{userRole}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#d1d1d1]/60 text-[11px]">Accessible Modules</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">{allowedTabs.length} / 9</span>
          </div>
          <div className="mt-2 pt-2 border-t border-white/5 flex items-center gap-2 text-[10px] uppercase tracking-wider text-emerald-500 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            RBAC Active
          </div>
        </div>
      </div>
    </aside>
  );
};
