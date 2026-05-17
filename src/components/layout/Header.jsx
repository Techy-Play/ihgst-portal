'use client';

import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, LogOut, ChevronDown, CheckCheck, X, Clock, Check, Trash2, BellOff, ArrowRight, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeSwitch from '@/components/ui/ThemeSwitch';

export default function Header() {
  const { data: session } = useSession();
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showAllPanel, setShowAllPanel] = useState(false);
  const [expandedNotif, setExpandedNotif] = useState(null);
  const menuRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
      if (notifRef.current && !notifRef.current.contains(e.target) && !showAllPanel) setShowNotifs(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showAllPanel]);

  const fetchNotifications = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (data.notifications) setNotifications(data.notifications);
      if (data.unreadCount !== undefined) setUnreadCount(data.unreadCount);
    } catch {}
  }, [session?.user?.id]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // Auto-refresh notifications every 15s
  useEffect(() => {
    if (!session?.user?.id) return;
    const iv = setInterval(fetchNotifications, 15000);
    return () => clearInterval(iv);
  }, [session?.user?.id, fetchNotifications]);

  const markAsRead = async (notifId) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: notifId }),
      });
      setNotifications(prev => prev.map(n => n._id === notifId ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const clearNotification = async (e, notifId) => {
    e.stopPropagation();
    try {
      await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: notifId }),
      });
      setNotifications(prev => prev.filter(n => n._id !== notifId));
      setUnreadCount(prev => {
        const cleared = notifications.find(n => n._id === notifId);
        return cleared && !cleared.read ? Math.max(0, prev - 1) : prev;
      });
    } catch {}
  };

  const clearAllNotifications = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearAll: true }),
      });
      setNotifications([]);
      setUnreadCount(0);
    } catch {}
  };

  const handleNotifClick = (notif) => {
    if (!notif.read) markAsRead(notif._id);
    if (notif.link) { router.push(notif.link); setShowNotifs(false); setShowAllPanel(false); }
  };

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const typeColors = {
    goal_created: { bg: 'rgba(16,185,129,0.15)', color: '#34d399' },
    goal_approved: { bg: 'rgba(99,102,241,0.15)', color: '#818cf8' },
    goal_returned: { bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
    checkin_updated: { bg: 'rgba(59,130,246,0.15)', color: '#60a5fa' },
    shared_goal: { bg: 'rgba(168,85,247,0.15)', color: '#c084fc' },
    default: { bg: 'rgba(99,102,241,0.12)', color: '#a5b4fc' },
  };

  const getColor = (type) => typeColors[type] || typeColors.default;

  const roleColors = {
    Admin: { bg: 'rgba(239,68,68,0.12)', color: '#f87171', border: 'rgba(239,68,68,0.25)' },
    Manager: { bg: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: 'rgba(59,130,246,0.25)' },
    Employee: { bg: 'rgba(16,185,129,0.12)', color: '#34d399', border: 'rgba(16,185,129,0.25)' },
  };
  const rc = roleColors[session?.user?.role] || roleColors.Employee;

  // Notification item renderer — shared between dropdown and slide panel
  const renderNotifItem = (n, compact = false) => {
    const tc = getColor(n.type);
    const typeIcons = {
      goal_created: <Check size={14} />,
      goal_approved: <CheckCheck size={14} />,
      goal_returned: <Clock size={14} />,
      checkin_updated: <Bell size={14} />,
      shared_goal: <Bell size={14} />,
    };
    const icon = typeIcons[n.type] || <Bell size={14} />;
    const isExpanded = expandedNotif === n._id;

    const typeLabels = {
      goal_created: 'Goal Created',
      goal_approved: 'Goal Approved',
      goal_returned: 'Goal Returned',
      checkin_updated: 'Check-in Update',
      shared_goal: 'Shared Goal',
    };

    return (
      <motion.div
        key={n._id}
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0, padding: 0 }}
        transition={{ duration: 0.2 }}
        style={{
          background: isExpanded ? 'rgba(99,102,241,0.06)' : (!n.read ? 'rgba(255,255,255,0.03)' : 'transparent'),
          border: `1px solid ${isExpanded ? 'rgba(99,102,241,0.2)' : 'var(--border-color)'}`,
          borderRadius: '12px', padding: '14px 16px', cursor: 'pointer',
          transition: 'all 0.2s', marginBottom: '8px',
        }}
        onClick={() => {
          if (!n.read) markAsRead(n._id);
          setExpandedNotif(isExpanded ? null : n._id);
        }}
      >
        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: tc.bg, color: tc.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: n.read ? 'var(--text-secondary)' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.title}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                {!n.read && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-secondary)', flexShrink: 0 }} />}
                <button onClick={(e) => clearNotification(e, n._id)} title="Dismiss" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}>
                  <X size={12} />
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '100px', background: tc.bg, color: tc.color, fontWeight: 600 }}>{typeLabels[n.type] || n.type}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Clock size={10} /> {timeAgo(n.createdAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Expanded content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border-color)' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '14px' }}>{n.message}</p>
                {n.link && (
                  <button
                    onClick={(e) => { e.stopPropagation(); router.push(n.link); setShowNotifs(false); setShowAllPanel(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', background: 'var(--accent-primary)', color: '#fff', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                  >
                    <ExternalLink size={14} /> View Details
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <>
      <header className="main-header" style={{ height: '72px', borderBottom: '1px solid var(--border-color)', background: 'var(--surface-header)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', gap: '16px', position: 'sticky', top: 0, zIndex: 30 }}>
        {/* Mobile Logo */}
        <div className="mobile-logo" style={{ display: 'none', alignItems: 'center', gap: '10px' }}>
          <img src="/logo.png" alt="IHGST" style={{ width: '30px', height: '30px', borderRadius: '8px', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
          <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'var(--gradient-1)', display: 'none', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '12px' }}>IG</div>
          <span style={{ fontWeight: 700, fontSize: '16px', letterSpacing: '-0.02em' }}>IHGST</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginLeft: 'auto' }}>

        <ThemeSwitch />

        {/* Notification bell */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button onClick={() => setShowNotifs(!showNotifs)} style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--surface-muted)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', transition: 'all 0.2s' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.background = 'var(--surface-muted-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = 'var(--surface-muted)'; }}>
            <Bell size={18} />
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                style={{ position: 'absolute', top: '-4px', right: '-4px', width: '18px', height: '18px', borderRadius: '50%', background: 'var(--gradient-1)', color: 'white', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >{unreadCount > 9 ? '9+' : unreadCount}</motion.span>
            )}
          </button>

          {/* Dropdown notification panel */}
          <AnimatePresence>
            {showNotifs && (
              <motion.div
                className="notif-dropdown"
                initial={{ opacity: 0, y: -10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.97 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                style={{ position: 'absolute', top: '48px', right: 0, width: '400px', maxHeight: '480px', background: 'var(--surface-popover)', backdropFilter: 'blur(24px)', border: '1px solid var(--border-hover)', borderRadius: '14px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', zIndex: 50, overflow: 'hidden' }}
              >
                {/* Header */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '15px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Bell size={16} style={{ color: 'var(--accent-secondary)' }} />
                    Notifications
                    {unreadCount > 0 && <span style={{ fontSize: 11, color: 'var(--accent-secondary)', background: 'rgba(99,102,241,0.12)', padding: '2px 8px', borderRadius: '100px', fontWeight: 600 }}>{unreadCount} new</span>}
                  </span>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: 'var(--accent-secondary)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                      <CheckCheck size={14} /> Mark all read
                    </button>
                  )}
                </div>

                {/* Body (show first 4) */}
                <div style={{ maxHeight: '340px', overflowY: 'auto', padding: '8px' }}>
                  {notifications.length === 0 ? (
                    <div className="notif-empty">
                      <BellOff size={32} style={{ opacity: 0.3 }} />
                      <p style={{ fontSize: 14 }}>No notifications</p>
                      <p style={{ fontSize: 12 }}>You&apos;re all caught up!</p>
                    </div>
                  ) : (
                    <AnimatePresence mode="popLayout">
                      {notifications.slice(0, 4).map(n => renderNotifItem(n, true))}
                    </AnimatePresence>
                  )}
                </div>

                {/* Footer */}
                {notifications.length > 0 && (
                  <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => { setShowAllPanel(true); setShowNotifs(false); }}
                      className="btn-glow"
                      style={{ flex: 1, fontSize: '13px', padding: '8px 16px', textAlign: 'center', justifyContent: 'center' }}
                    >View All ({notifications.length})</button>
                    <button
                      onClick={clearAllNotifications}
                      style={{ padding: '8px 14px', borderRadius: '10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#f87171', fontSize: '13px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.2s' }}
                    ><Trash2 size={13} /> Clear</button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User menu */}
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button onClick={() => setShowMenu(!showMenu)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 12px 6px 6px', borderRadius: '12px', background: 'var(--surface-muted)', border: '1px solid var(--border-color)', cursor: 'pointer', color: 'var(--text-primary)' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--gradient-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '13px' }}>{session?.user?.name?.charAt(0)?.toUpperCase() || 'U'}</div>
            <div style={{ textAlign: 'left' }}><p style={{ fontSize: '13px', fontWeight: 600, lineHeight: 1.2 }}>{session?.user?.name || 'User'}</p><p style={{ fontSize: '11px', color: rc.color }}>{session?.user?.role || 'Loading...'}</p></div>
            <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
          </button>
          <AnimatePresence>
            {showMenu && (
              <motion.div
                className="user-dropdown"
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                style={{ position: 'absolute', top: '52px', right: 0, width: '220px', background: 'var(--surface-popover)', backdropFilter: 'blur(24px)', border: '1px solid var(--border-hover)', borderRadius: '14px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', overflow: 'hidden', zIndex: 50 }}
              >
                <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border-color)' }}>
                  <p style={{ fontSize: '13px', fontWeight: 600 }}>{session?.user?.name}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{session?.user?.email}</p>
                  <span className="badge" style={{ marginTop: '8px', background: rc.bg, color: rc.color, borderColor: rc.border }}>{session?.user?.role}</span>
                </div>
                <button onClick={() => signOut({ callbackUrl: '/' })} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px', background: 'none', border: 'none', color: '#f87171', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
                  <LogOut size={16} /> Sign Out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        </div>
      </header>

      {/* Full-screen slide-out notification panel */}
      <AnimatePresence>
        {showAllPanel && (
          <>
            <motion.div
              className="notif-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setShowAllPanel(false)}
            />
            <motion.div
              className="notif-slide-panel"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="notif-panel-header">
                <div className="notif-panel-title">
                  <Bell size={18} style={{ color: 'var(--accent-secondary)' }} />
                  All Notifications
                  {unreadCount > 0 && <span style={{ fontSize: 11, color: 'var(--accent-secondary)', background: 'rgba(99,102,241,0.12)', padding: '2px 8px', borderRadius: '100px', fontWeight: 600 }}>{unreadCount} unread</span>}
                </div>
                <button onClick={() => setShowAllPanel(false)} style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--surface-muted)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={16} />
                </button>
              </div>

              <div className="notif-panel-body">
                {notifications.length === 0 ? (
                  <div className="notif-empty">
                    <BellOff size={40} style={{ opacity: 0.3 }} />
                    <p style={{ fontSize: 15, fontWeight: 600 }}>No notifications</p>
                    <p style={{ fontSize: 13 }}>You&apos;re all caught up!</p>
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {notifications.map(n => renderNotifItem(n))}
                  </AnimatePresence>
                )}
              </div>

              {notifications.length > 0 && (
                <div className="notif-panel-footer" style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => { markAllRead(); }}
                    className="btn-glow"
                    style={{ flex: 1, fontSize: '13px', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  ><CheckCheck size={14} /> Mark All as Read</button>
                  <button
                    onClick={() => { clearAllNotifications(); setShowAllPanel(false); }}
                    style={{ padding: '10px 16px', borderRadius: '12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#f87171', fontSize: '13px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}
                  ><Trash2 size={14} /> Clear All</button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
