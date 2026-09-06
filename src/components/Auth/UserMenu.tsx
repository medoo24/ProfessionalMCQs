import React, { useState, useEffect, useRef } from 'react';
import { I } from '../Icons';
import firebase from 'firebase/compat/app';

export interface UserMenuProps {
  user: firebase.User | null;
  syncStatus: string;
  onSignOut: () => void;
  onSyncNow: () => void;
  lastSynced: number | null;
}

export function UserMenu({ user, syncStatus, onSignOut, onSyncNow, lastSynced }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isAnon = user?.isAnonymous;
  const displayName = isAnon ? 'Anonymous' : (user?.displayName || user?.email || 'User');
  const initials = isAnon ? '?' : (user?.displayName || user?.email || 'U').slice(0, 2).toUpperCase();

  const syncLabel = {
    idle: 'Synced',
    syncing: 'Syncing…',
    error: 'Sync error',
    offline: 'Offline',
    local: 'Local only',
  }[syncStatus] || 'Synced';

  const syncColor = {
    idle: 'var(--green)',
    syncing: 'var(--yellow)',
    error: 'var(--red)',
    offline: 'var(--muted)',
    local: 'var(--muted)',
  }[syncStatus] || 'var(--green)';

  if (!user) return null;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="auth-user-menu" onClick={() => setOpen(v => !v)}>
        {user.photoURL ? (
          <img src={user.photoURL} style={{ width: 26, height: 26, borderRadius: '50%' }} alt="avatar" />
        ) : (
          <div className="auth-avatar">{initials}</div>
        )}
        <span style={{ maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {isAnon ? 'Anonymous' : (user.displayName || user.email?.split('@')[0] || 'User')}
        </span>
        <div className={`auth-sync-dot ${syncStatus === 'syncing' ? 'syncing' : syncStatus === 'error' ? 'error' : ''}`}
          style={{ background: syncColor }} title={syncLabel} />
      </button>

      {open && (
        <div className="user-dropdown">
          {/* User info */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{displayName}</div>
            {!isAnon && user.email && (
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{user.email}</div>
            )}
            <div style={{ fontSize: 11, color: syncColor, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: syncColor }} />
              {syncLabel}
              {lastSynced && syncStatus === 'idle' && (
                <span style={{ color: 'var(--muted)', marginLeft: 4 }}>
                  · {new Date(lastSynced).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          {!isAnon && (
            <button
              onClick={() => { onSyncNow(); setOpen(false); }}
              className="dd-item"
              style={{
                width: '100%', textAlign: 'left', background: 'none', border: 'none',
                cursor: 'pointer', color: 'var(--text)', fontSize: 13,
                display: 'flex', alignItems: 'center', gap: 8
              }}
              disabled={syncStatus === 'syncing'}
            >
              <I.Cloud size={14} />
              <span>{syncStatus === 'syncing' ? 'Syncing…' : 'Sync Now'}</span>
            </button>
          )}

          {isAnon && (
            <div style={{ padding: '8px 16px', fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
              Sign in to sync progress across devices
            </div>
          )}

          <button
            onClick={() => { onSignOut(); setOpen(false); }}
            className="dd-item"
            style={{
              width: '100%', textAlign: 'left', background: 'none', border: 'none',
              cursor: 'pointer', color: 'var(--red)', fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 8
            }}
          >
            <I.LogOut size={14} />
            <span>{isAnon ? 'Exit anonymous' : 'Sign Out'}</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default UserMenu;
