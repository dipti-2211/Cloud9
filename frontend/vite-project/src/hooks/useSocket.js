/**
 * useSocket.js — singleton Socket.IO connection
 *
 * Usage:
 *   const { socket, connected } = useSocket();
 *   useEffect(() => {
 *     socket.on('road_segment_updated', handler);
 *     return () => socket.off('road_segment_updated', handler);
 *   }, [socket]);
 */

import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:1710';

// Module-level singleton — one connection shared across all components
let _socket = null;
let _refCount = 0;

function getSocket() {
  if (!_socket || _socket.disconnected) {
    _socket = io(SOCKET_URL, {
      query: { room: 'dashboard' },
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      transports: ['websocket', 'polling'],
    });
  }
  return _socket;
}

export function useSocket() {
  const socket = useRef(getSocket());
  const [connected, setConnected] = useState(socket.current.connected);

  useEffect(() => {
    _refCount++;
    const s = socket.current;

    const onConnect    = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    s.on('connect',    onConnect);
    s.on('disconnect', onDisconnect);

    // Join dashboard room on (re)connect
    s.on('connect', () => s.emit('join', 'dashboard'));

    return () => {
      s.off('connect',    onConnect);
      s.off('disconnect', onDisconnect);
      _refCount--;
      // Only disconnect if no more consumers
      if (_refCount === 0 && s.connected) {
        s.disconnect();
        _socket = null;
      }
    };
  }, []);

  return { socket: socket.current, connected };
}
