'use client';

import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import {
  LayoutDashboard, Target, CheckSquare, BarChart3,
  Users, Shield, MoreHorizontal, X,
  Calendar, FileText, History
} from 'lucide-react';

/* ── Bottom nav items per role ──
   Show max 4 primary tabs + "More" overflow menu.
   Instagram pattern: fixed icons, active indicator, clean labels. */

const bottomTabs = {
  Employee: {
    primary: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
      { href: '/goals', icon: Target, label: 'Goals' },
      { href: '/checkin', icon: CheckSquare, label: 'Check-in' },
      { href: '/analytics', icon: BarChart3, label: 'Analytics' },
    ],
    overflow: [],
  },
  Manager: {
    primary: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
      { href: '/goals', icon: Target, label: 'KPIs' },
      { href: '/manager', icon: Users, label: 'Team' },
      { href: '/analytics?scope=team', icon: BarChart3, label: 'Analytics' },
    ],
    overflow: [
      { href: '/checkin', icon: CheckSquare, label: 'My Check-ins' },
      { href: '/manager/kpi', icon: Target, label: 'Assign KPIs' },
      { href: '/manager/checkins', icon: CheckSquare, label: 'Team Check-ins' },
      { href: '/analytics?scope=personal', icon: BarChart3, label: 'My Analytics' },
    ],
  },
  Admin: {
    primary: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
      { href: '/admin', icon: Shield, label: 'Admin' },
      { href: '/manager', icon: Target, label: 'Goals' },
      { href: '/analytics', icon: BarChart3, label: 'Analytics' },
    ],
    overflow: [
      { href: '/manager/kpi', icon: Target, label: 'Assign KPIs' },
      { href: '/admin/users', icon: Users, label: 'Users' },
      { href: '/admin/cycles', icon: Calendar, label: 'Cycles' },
      { href: '/admin/reports', icon: FileText, label: 'Reports' },
      { href: '/admin/audit', icon: History, label: 'Audit Log' },
    ],
  },
};

export default function BottomNav() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);
  const role = session?.user?.role || 'Employee';
  const config = bottomTabs[role] || bottomTabs.Employee;

  const isActive = (href) => {
    const basePath = href.split('?')[0];
    return pathname === basePath || pathname.startsWith(`${basePath}/`);
  };

  const hasOverflow = config.overflow.length > 0;

  return (
    <>
      {/* Bottom tab bar */}
      <nav className="bottom-nav">
        {config.primary.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`bottom-nav-tab ${active ? 'active' : ''}`}
              onClick={() => setShowMore(false)}
            >
              <div className="bottom-nav-icon-wrap">
                <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
                {active && <div className="bottom-nav-dot" />}
              </div>
              <span className="bottom-nav-label">{tab.label}</span>
            </Link>
          );
        })}

        {/* More button for overflow items */}
        {hasOverflow && (
          <button
            className={`bottom-nav-tab ${showMore ? 'active' : ''}`}
            onClick={() => setShowMore(!showMore)}
          >
            <div className="bottom-nav-icon-wrap">
              {showMore ? <X size={22} strokeWidth={2} /> : <MoreHorizontal size={22} strokeWidth={1.8} />}
            </div>
            <span className="bottom-nav-label">More</span>
          </button>
        )}
      </nav>

      {/* Overflow sheet */}
      {showMore && hasOverflow && (
        <>
          <div className="bottom-nav-overlay" onClick={() => setShowMore(false)} />
          <div className="bottom-nav-sheet">
            <div className="bottom-nav-sheet-handle" />
            {config.overflow.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`bottom-nav-sheet-item ${active ? 'active' : ''}`}
                  onClick={() => setShowMore(false)}
                >
                  <div className="bottom-nav-sheet-icon">
                    <Icon size={20} />
                  </div>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
