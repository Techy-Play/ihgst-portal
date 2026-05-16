'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const toastConfig = {
  success: {
    icon: CheckCircle,
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.3)',
    color: '#34d399',
    label: 'Success',
  },
  error: {
    icon: XCircle,
    bg: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.3)',
    color: '#f87171',
    label: 'Error',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.3)',
    color: '#fbbf24',
    label: 'Warning',
  },
  info: {
    icon: Info,
    bg: 'rgba(99, 102, 241, 0.12)',
    border: 'rgba(99, 102, 241, 0.3)',
    color: '#818cf8',
    label: 'Info',
  },
};

function ToastItem({ toast, onDismiss }) {
  const config = toastConfig[toast.type] || toastConfig.info;
  const Icon = config.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.95 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="toast-popup"
      style={{
        background: config.bg,
        borderColor: config.border,
      }}
    >
      <div className="toast-popup-icon" style={{ color: config.color }}>
        <Icon size={18} />
      </div>
      <div className="toast-popup-content">
        <span className="toast-popup-title" style={{ color: config.color }}>{config.label}</span>
        <span className="toast-popup-msg">{toast.msg}</span>
      </div>
      <button className="toast-popup-close" onClick={() => onDismiss(toast.id)}>
        <X size={14} />
      </button>
      {/* Auto-dismiss progress bar */}
      <motion.div
        className="toast-popup-progress"
        style={{ background: config.color }}
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: toast.duration / 1000, ease: 'linear' }}
      />
    </motion.div>
  );
}

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [mounted, setMounted] = useState(false);

  // Ensure portal only renders after client-side hydration
  useEffect(() => { setMounted(true); }, []);

  const showToast = useCallback((msg, type = 'info', duration = 4000) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, msg, type, duration }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {mounted && createPortal(
        <div className="toast-popup-container">
          <AnimatePresence mode="popLayout">
            {toasts.map(t => (
              <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
            ))}
          </AnimatePresence>
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}
