/**
 * KpiPopover.jsx
 *
 * Wraps a KPI card and shows a floating popover with live detail items
 * on hover / focus (keyboard-accessible) / tap (touch).
 *
 * Props:
 *   children    — the KPI card node
 *   items       — array of { primary, secondary?, badge? } objects
 *   viewAllHref — react-router path for "View all →" footer link
 *   disabled    — if true, renders children as-is with no popover
 */
import { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';

export const KpiPopover = ({ children, items = [], viewAllHref, disabled = false }) => {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef(null);

  const show = useCallback(() => {
    clearTimeout(closeTimer.current);
    setOpen(true);
  }, []);

  // Short delay before hiding so the user can mouse into the popover
  const hide = useCallback(() => {
    closeTimer.current = setTimeout(() => setOpen(false), 180);
  }, []);

  if (disabled || !items.length) return children;

  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      tabIndex={0}
      role="button"
      aria-haspopup="true"
      aria-expanded={open}
      onKeyDown={e => { if (e.key === 'Escape') setOpen(false); }}
    >
      {children}

      {open && (
        <div
          onMouseEnter={show}
          onMouseLeave={hide}
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            zIndex: 2000,
            width: 290,
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
            overflow: 'hidden',
            animation: 'popoverFadeIn 0.15s ease',
          }}
        >
          {/* Items */}
          <div style={{ padding: '8px 0' }}>
            {items.slice(0, 6).map((item, i) => (
              <div
                key={i}
                style={{
                  padding: '7px 14px',
                  borderBottom: i < Math.min(items.length, 6) - 1 ? '1px solid var(--border)' : 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.primary}
                  </div>
                  {item.secondary && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 1, lineHeight: 1.3 }}>
                      {item.secondary}
                    </div>
                  )}
                </div>
                {item.badge && (
                  <span style={{
                    flexShrink: 0,
                    fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px',
                    borderRadius: '8px',
                    background: item.badgeColor ? `${item.badgeColor}22` : 'var(--surface-hover)',
                    color: item.badgeColor ?? 'var(--text-secondary)',
                    border: `1px solid ${item.badgeColor ?? 'var(--border)'}`,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}>
                    {item.badge}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          {viewAllHref && (
            <div style={{
              borderTop: '1px solid var(--border)',
              padding: '8px 14px',
              background: 'var(--bg-primary)',
            }}>
              <Link
                to={viewAllHref}
                style={{ fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}
                onClick={() => setOpen(false)}
              >
                View all →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
