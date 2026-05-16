'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function parseDate(val) {
  if (!val) return null;
  const d = new Date(val + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
}

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDisplay(val) {
  const d = parseDate(val);
  if (!d) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

export default function CustomDatePicker({ value, onChange, label, placeholder = 'Select date...', disabled = false, required = false, minDate = null, maxDate = null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  const parsed = parseDate(value);
  const [viewYear, setViewYear] = useState(parsed?.getFullYear() || new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.getMonth() ?? new Date().getMonth());

  const minD = minDate ? parseDate(minDate) : null;
  const maxD = maxDate ? parseDate(maxDate) : null;

  // Helper: is a specific date in current view disabled?
  const isDisabled = (day) => {
    const d = new Date(viewYear, viewMonth, day);
    if (minD && d < minD) return true;
    if (maxD && d > maxD) return true;
    return false;
  };

  // Sync view when value changes externally
  useEffect(() => {
    const d = parseDate(value);
    if (d) { setViewYear(d.getFullYear()); setViewMonth(d.getMonth()); }
  }, [value]);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const panelH = 370;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < panelH && rect.top > panelH;
    setPos({
      top: openUp ? rect.top - panelH - 6 : rect.bottom + 6,
      left: Math.min(rect.left, window.innerWidth - 320),
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    const h = () => updatePosition();
    window.addEventListener('scroll', h, true);
    window.addEventListener('resize', h);
    return () => { window.removeEventListener('scroll', h, true); window.removeEventListener('resize', h); };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (triggerRef.current?.contains(e.target)) return;
      if (panelRef.current?.contains(e.target)) return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') setIsOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen]);

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) updatePosition();
    setIsOpen(!isOpen);
  };

  const handleSelect = (day) => {
    if (isDisabled(day)) return;
    const d = new Date(viewYear, viewMonth, day);
    onChange(formatDate(d));
    setIsOpen(false);
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const goToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    onChange(formatDate(now));
    setIsOpen(false);
  };

  const clear = (e) => {
    e.stopPropagation();
    onChange('');
  };

  // Build calendar grid
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const prevDays = getDaysInMonth(viewYear, viewMonth === 0 ? 11 : viewMonth - 1);
  const today = new Date();
  const isToday = (d) => today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === d;
  const isSelected = (d) => parsed && parsed.getFullYear() === viewYear && parsed.getMonth() === viewMonth && parsed.getDate() === d;

  const cells = [];
  // Previous month's trailing days
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: prevDays - i, type: 'prev' });
  }
  // Current month
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({ day: i, type: 'current' });
  }
  // Next month's leading days
  const remaining = 42 - cells.length;
  for (let i = 1; i <= remaining; i++) {
    cells.push({ day: i, type: 'next' });
  }

  return (
    <div>
      {label && <label className="dropdown-label">{label}</label>}
      <motion.button
        ref={triggerRef}
        type="button"
        whileTap={!disabled ? { scale: 0.995 } : {}}
        onClick={handleToggle}
        className={`custom-dropdown-trigger ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''}`}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={15} style={{ color: 'var(--accent-secondary)', flexShrink: 0 }} />
          <span className={value ? 'dropdown-value' : 'dropdown-placeholder'}>
            {formatDisplay(value) || placeholder}
          </span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {value && !disabled && (
            <span onClick={clear} style={{ display: 'flex', alignItems: 'center', padding: '2px', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-muted)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}>
              <X size={14} />
            </span>
          )}
        </div>
      </motion.button>

      {typeof window !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, y: -10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.97 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="calendar-panel"
              style={{ position: 'fixed', top: pos.top, left: pos.left }}
            >
              {/* Header */}
              <div className="calendar-header">
                <button type="button" className="calendar-nav-btn" onClick={prevMonth}>
                  <ChevronLeft size={16} />
                </button>
                <span className="calendar-month-label">
                  {MONTHS[viewMonth]} {viewYear}
                </span>
                <button type="button" className="calendar-nav-btn" onClick={nextMonth}>
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Day names */}
              <div className="calendar-days-header">
                {DAYS.map(d => <span key={d} className="calendar-day-name">{d}</span>)}
              </div>

              {/* Day grid */}
              <div className="calendar-grid">
                {cells.map((cell, i) => (
                  <button
                    type="button"
                    key={i}
                    disabled={cell.type === 'current' && isDisabled(cell.day)}
                    className={[
                      'calendar-day',
                      cell.type !== 'current' ? 'other-month' : '',
                      cell.type === 'current' && isToday(cell.day) ? 'today' : '',
                      cell.type === 'current' && isSelected(cell.day) ? 'selected' : '',
                      cell.type === 'current' && isDisabled(cell.day) ? 'disabled-day' : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() => {
                      if (cell.type === 'prev') { prevMonth(); }
                      else if (cell.type === 'next') { nextMonth(); }
                      else { handleSelect(cell.day); }
                    }}
                  >
                    {cell.day}
                  </button>
                ))}
              </div>

              {/* Footer */}
              <div className="calendar-footer">
                <button type="button" className="calendar-today-btn" onClick={goToday}>
                  Today
                </button>
                {value && (
                  <span className="calendar-selected-label">
                    {formatDisplay(value)}
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
