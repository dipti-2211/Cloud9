/**
 * useUserLocation.js — v3 (no circular deps, auto-retry on permission grant)
 *
 * Strategy:
 * 1. On mount: check if permission is already "granted" → start watch immediately
 *    (no prompt, coords appear right away)
 * 2. requestLocation() → browser prompts if needed, starts watch
 * 3. If denied: listen for permission change via Permissions API → auto-restart
 *    the moment the user flips the browser toggle to Allow
 * 4. Coords are set IMMEDIATELY on first GPS fix — marker + flyTo fire
 *    independently of the risk API call
 */

import { useState, useRef, useEffect } from 'react';
import { getLandslideRisk } from '../services/api';

export const useUserLocation = () => {
  const [coords, setCoords] = useState(null);
  const [risk,   setRisk  ] = useState(null);
  const [status, setStatus] = useState('idle');

  // All mutable handles live in refs to avoid stale closures
  const watchIdRef   = useRef(null);
  const riskDoneRef  = useRef(false);
  const permStatusRef = useRef(null); // PermissionStatus object for cleanup

  // ------------------------------------------------------------------
  // Internal: start (or restart) watchPosition
  // ------------------------------------------------------------------
  const _start = () => {
    if (!navigator.geolocation) { setStatus('unsupported'); return; }

    // Kill any existing watch
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    riskDoneRef.current = false;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lon, heading, accuracy } = pos.coords;

        // ── Step 1 (IMMEDIATE): set coords → marker appears, map flies ──
        setCoords({ lat, lon, heading: heading ?? null, accuracy: accuracy ?? null });
        setStatus('granted');

        // ── Step 2 (async, secondary): fetch risk for the banner ──
        if (!riskDoneRef.current) {
          riskDoneRef.current = true;
          getLandslideRisk(lat, lon)
            .then(result => {
              if (result?.error === 'outside_coverage') {
                setRisk(null);
                setStatus('granted_no_coverage');
              } else {
                setRisk(result);
                setStatus('granted');
              }
            })
            .catch(() => setStatus('risk_error'));
        }
      },
      (err) => {
        // Only PERMISSION_DENIED (code 1) warrants a denied status
        if (err.code === 1) {
          setStatus('denied');
          _listenForPermissionGrant();
        } else {
          // POSITION_UNAVAILABLE (2) or TIMEOUT (3) — show denied so user can retry
          setStatus('denied');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // ------------------------------------------------------------------
  // Internal: watch Permissions API → auto-restart when user says Allow
  // ------------------------------------------------------------------
  const _listenForPermissionGrant = () => {
    if (!navigator.permissions) return; // not supported (older iOS, etc.)

    navigator.permissions.query({ name: 'geolocation' }).then(permStatus => {
      // Cleanup previous listener
      if (permStatusRef.current) {
        permStatusRef.current.onchange = null;
      }
      permStatusRef.current = permStatus;

      permStatus.onchange = () => {
        if (permStatus.state === 'granted') {
          // User clicked Allow in the browser — auto-restart immediately
          setStatus('requesting');
          setCoords(null);
          setRisk(null);
          riskDoneRef.current = false;
          _start();
          // Detach listener — no longer needed
          permStatus.onchange = null;
          permStatusRef.current = null;
        }
      };
    }).catch(() => {}); // silently ignore
  };

  // ------------------------------------------------------------------
  // On mount: if permission is ALREADY granted, start silently
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!navigator.geolocation) { setStatus('unsupported'); return; }

    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then(permStatus => {
        if (permStatus.state === 'granted') {
          // Permission already granted → start watch immediately, no prompt
          setStatus('requesting');
          _start();
        }
        // If 'prompt' or 'denied', wait for explicit requestLocation() call
      }).catch(() => {
        // Permissions API not available — just start and let the browser prompt
        setStatus('requesting');
        _start();
      });
    }

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (permStatusRef.current) {
        permStatusRef.current.onchange = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ------------------------------------------------------------------
  // Public: requestLocation() — called by button or on Dashboard mount
  // ------------------------------------------------------------------
  const requestLocation = () => {
    setStatus('requesting');
    setCoords(null);
    setRisk(null);
    _start();
  };

  // ------------------------------------------------------------------
  // Public: setManualCoords() — demo buttons
  // ------------------------------------------------------------------
  const setManualCoords = (lat, lon) => {
    // Immediately show marker at this demo location
    setCoords({ lat, lon, heading: null, accuracy: null });
    setStatus('granted');
    setRisk(null);
    riskDoneRef.current = true; // don't re-fetch from the GPS callback
    getLandslideRisk(lat, lon)
      .then(result => {
        if (result?.error === 'outside_coverage') {
          setRisk(null); setStatus('granted_no_coverage');
        } else {
          setRisk(result); setStatus('granted');
        }
      })
      .catch(() => setStatus('risk_error'));
  };

  return { coords, risk, status, requestLocation, setManualCoords };
};
