'use client';

import { useSession } from 'next-auth/react';
import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Target, CheckSquare, Users, Shield, BarChart3, Calendar, FileText, History, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

const navItems = {
  Employee: [
    { href: '/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard', exact: true },
    { href: '/goals', icon: <Target size={18} />, label: 'My Goals' },
    { href: '/checkin', icon: <CheckSquare size={18} />, label: 'Check-ins', exact: true },
    { href: '/analytics', icon: <BarChart3 size={18} />, label: 'Analytics', exact: true },
  ],
  Manager: [
    { type: 'header', label: 'Personal Section' },
    { href: '/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard', exact: true },
    { href: '/goals', icon: <Target size={18} />, label: 'My KPIs' },
    { href: '/checkin', icon: <CheckSquare size={18} />, label: 'My Check-ins', exact: true },
    { href: '/analytics?scope=personal', icon: <BarChart3 size={18} />, label: 'My Analytics', exact: true },
    { type: 'header', label: 'Team Management' },
    { href: '/manager', icon: <Users size={18} />, label: 'Team Review', exact: true },
    { href: '/manager/kpi', icon: <Target size={18} />, label: 'Assign KPIs', exact: true },
    { href: '/manager/checkins', icon: <CheckSquare size={18} />, label: 'Team Check-ins', exact: true },
    { href: '/analytics?scope=team', icon: <BarChart3 size={18} />, label: 'Team Analytics', exact: true },
  ],
  Admin: [
    { href: '/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard', exact: true },
    { href: '/admin', icon: <Shield size={18} />, label: 'Admin Panel', exact: true },
    { href: '/manager', icon: <Target size={18} />, label: 'Goal Approvals', exact: true },
    { href: '/manager/kpi', icon: <Target size={18} />, label: 'Assign KPIs', exact: true },
    { href: '/admin/users', icon: <Users size={18} />, label: 'Users', exact: true },
    { href: '/admin/cycles', icon: <Calendar size={18} />, label: 'Cycles', exact: true },
    { href: '/admin/reports', icon: <FileText size={18} />, label: 'Reports', exact: true },
    { href: '/admin/audit', icon: <History size={18} />, label: 'Audit Log', exact: true },
    { href: '/analytics', icon: <BarChart3 size={18} />, label: 'Analytics', exact: true },
  ],
};

export default function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentQuery = searchParams.toString();
  const [collapsed, setCollapsed] = useState(false);
  const role = session?.user?.role || 'Employee';
  const items = navItems[role] || navItems.Employee;

  return (
    <aside style={{ width: collapsed ? '72px' : '250px', borderRight: '1px solid var(--border-color)', background: 'var(--surface-sidebar)', backdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column', transition: 'width 0.3s ease', position: 'relative', minHeight: '100vh' }}>
      <div style={{ padding: collapsed ? '20px 16px' : '20px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <img src="/logo.png" alt="IHGST" style={{ width: '36px', height: '36px', minWidth: '36px', borderRadius: '10px', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
        <div style={{ width: '36px', height: '36px', minWidth: '36px', borderRadius: '10px', background: 'var(--gradient-1)', display: 'none', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '14px' }}>IG</div>
        {!collapsed && <span style={{ fontWeight: 700, fontSize: '16px', letterSpacing: '-0.02em' }}>IHGST</span>}
      </div>
      <nav style={{ padding: '12px 8px', flex: 1 }}>
        {items.map((item, i) => {
          if (item.type === 'header') {
            return !collapsed ? (
              <div key={`header-${i}`} style={{ padding: '16px 16px 8px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {item.label}
              </div>
            ) : <div key={`header-spacer-${i}`} style={{ height: '1px', background: 'var(--border-color)', margin: '8px 4px' }} />;
          }
          const basePath = item.href.split('?')[0];
          const hrefQuery = item.href.includes('?') ? item.href.split('?')[1] : '';
          // For links with query params (like analytics?scope=team), match both path and query
          const isActive = hrefQuery
            ? (pathname === basePath && currentQuery === hrefQuery)
            : item.exact ? (pathname === basePath) : (pathname === basePath || pathname.startsWith(`${basePath}/`));
          return (
            <Link key={item.href} href={item.href} className={`sidebar-link ${isActive ? 'active' : ''}`} style={{ justifyContent: collapsed ? 'center' : 'flex-start', padding: collapsed ? '10px' : '10px 16px', marginBottom: '2px' }}>
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
      <button onClick={() => setCollapsed(!collapsed)} style={{ position: 'absolute', top: '80px', right: '-14px', width: '28px', height: '28px', borderRadius: '50%', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>
  );
}
