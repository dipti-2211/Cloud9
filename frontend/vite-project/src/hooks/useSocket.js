/**
 * useSocket.js — stable Socket.IO singleton
 *
 * Guarantees:
 *  - One shared connection per browser tab.
 *  - Components always receive the LIVE socket instance via React state
 *    (never a stale ref frozen at mount time).
 *  - The 'connect'→'join dashboard' handler is named so it can be properly
 *    removed with .off() — no anonymous-listener leak.
 *  - The singleton is NOT torn down on brief refCount-0 dips (React
 *    StrictMode double-effects, route transitions, etc.).  A 4-second grace
 *    period absorbs those before actually disconnecting.
 *
 * Usage:
 *   const { socket, connected } = useSocket();
 *   useEffect(() => {
 *     if (!socket) return;
 *     socket.on('road_segment_updated', handler);
 *     return () => socket.off('road_segment_updated', handler);
 *   }, [socket]);     // ← 'socket' in deps re-runs the effect if the
 *                     //   singleton is ever recreated
 */

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:1710';

// ── Module-level singleton ─────────────────────────────────────────────────
let _socket   = null;
let _refCount = 0;
let _gcTimer  = null;
const _subs   = new Set();   // components to notify on instance swap

function _notify() {
  _subs.forEach(fn => fn(_socket));
}

/** Create a brand-new Socket.IO instance with a named join handler. */
function _createSocket() {
  const s = io(SOCKET_URL, {
    query: { room: 'dashboard' },
    reconnectionAttempts: Infinity,   // keep trying; don't give up after 5
    reconnectionDelay: 2000,
    transports: ['websocket', 'polling'],
  });

  // Named handler — stored on the socket so cleanup can call .off() precisely
  s._joinDashboard = () => s.emit('join', 'dashboard');
  s.on('connect', s._joinDashboard);

  return s;
}

/**
 * True if the socket is connected OR is actively in the process of
 * connecting / reconnecting (socket.active).  We must NOT replace a socket
 * that is still trying to connect just because socket.connected is false.
 */
function _isAlive(s) {
  return s != null && (s.connected || s.active);
}

/**
 * Return the existing live singleton or create a new one.
 * Cancels any pending GC timer.  Does NOT change refCount.
 */
function _ensure() {
  if (_gcTimer) { clearTimeout(_gcTimer); _gcTimer = null; }

  if (!_isAlive(_socket)) {
    // Tear down any dead socket cleanly before creating a replacement
    if (_socket) {
      _socket.off('connect', _socket._joinDashboard);
      _socket.disconnect();
    }
    _socket = _createSocket();
    _notify();              // tell all mounted consumers about the new instance
  }

  return _socket;
}

/** Increment refCount and return the live socket. */
function _acquire() {
  const s = _ensure();
  _refCount++;
  return s;
}

/** Decrement refCount; schedule GC after a grace period if it reaches 0. */
function _release() {
  _refCount = Math.max(0, _refCount - 1);
  if (_refCount > 0) return;

  // Grace period: route transitions and StrictMode double-effects will
  // re-acquire within milliseconds, well inside this 4-second window.
  _gcTimer = setTimeout(() => {
    _gcTimer = null;
    if (_refCount === 0 && _socket) {
      _socket.off('connect', _socket._joinDashboard);
      _socket.disconnect();
      _socket = null;
      _notify();
    }
  }, 4000);
}

// ── Hook ──────────────────────────────────────────────────────────────────
export function useSocket() {
  // _ensure() (no refCount change) gives us the live instance synchronously
  // on first render so consumers don't have to handle a null initial value.
  const [socketInst, setSocketInst] = useState(() => _ensure());
  const [connected,  setConnected ] = useState(() => _socket?.connected ?? false);

  useEffect(() => {
    // Now actually count this consumer so GC knows it's in use.
    _acquire();

    // Subscribe to instance swaps so state stays current if the singleton
    // is ever recreated (e.g. after the 4-second GC fires and a new consumer
    // later mounts).
    const onSwap = (newSock) => {
      setSocketInst(newSock);
      setConnected(newSock?.connected ?? false);
    };
    _subs.add(onSwap);

    // Attach live/dead listeners to the CURRENT socket.
    // _ensure() here is safe — it returns the same instance unless the
    // singleton was replaced between render and this effect (very unlikely,
    // but handled correctly by the onSwap subscriber above).
    const s = _ensure();
    const onConnect    = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    s.on('connect',    onConnect);
    s.on('disconnect', onDisconnect);

    return () => {
      s.off('connect',    onConnect);
      s.off('disconnect', onDisconnect);
      _subs.delete(onSwap);
      _release();
    };
  }, []); // intentionally empty — one mount / one unmount per component

  return { socket: socketInst, connected };
}
