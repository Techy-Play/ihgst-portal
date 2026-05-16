'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';

export default function CustomDropdown({ options = [], value, onChange, placeholder = 'Select...', label, disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  // Position the menu relative to the trigger
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const menuHeight = Math.min(280, options.length * 52 + 8);
    const openUpward = spaceBelow < menuHeight && rect.top > menuHeight;

    setMenuPos({
      top: openUpward ? rect.top - menuHeight - 6 : rect.bottom + 6,
      left: rect.left,
      width: rect.width,
    });
  }, [options.length]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (triggerRef.current?.contains(e.target)) return;
      if (menuRef.current?.contains(e.target)) return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') setIsOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen]);

  // Reposition on scroll/resize
  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    const handleScroll = () => updatePosition();
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isOpen, updatePosition]);

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) updatePosition();
    setIsOpen(!isOpen);
  };

  const selectedOption = options.find(o => (typeof o === 'string' ? o : o.value) === value);
  const displayLabel = selectedOption ? (typeof selectedOption === 'string' ? selectedOption : selectedOption.label) : '';

  return (
    <div style={{ position: 'relative' }}>
      {label && <label className="dropdown-label">{label}</label>}
      <motion.button
        ref={triggerRef}
        type="button"
        whileTap={!disabled ? { scale: 0.995 } : {}}
        onClick={handleToggle}
        className={`custom-dropdown-trigger ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className={displayLabel ? 'dropdown-value' : 'dropdown-placeholder'}>
          {displayLabel || placeholder}
        </span>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.25 }}>
          <ChevronDown size={16} />
        </motion.div>
      </motion.button>

      {typeof window !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="custom-dropdown-menu"
              role="listbox"
              style={{
                position: 'fixed',
                top: menuPos.top,
                left: menuPos.left,
                width: menuPos.width,
              }}
            >
              {options.map((opt, index) => {
                const optValue = typeof opt === 'string' ? opt : opt.value;
                const optLabel = typeof opt === 'string' ? opt : opt.label;
                const optDesc = typeof opt === 'string' ? null : opt.description;
                const isSelected = value === optValue;

                return (
                  <motion.button
                    type="button"
                    key={optValue}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.03 }}
                    onClick={() => { onChange(optValue); setIsOpen(false); }}
                    className={`custom-dropdown-option ${isSelected ? 'selected' : ''}`}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="dropdown-option-content">
                      <span className="dropdown-option-label">{optLabel}</span>
                      {optDesc && <span className="dropdown-option-desc">{optDesc}</span>}
                    </div>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className="dropdown-check"
                      >
                        <Check size={14} />
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
