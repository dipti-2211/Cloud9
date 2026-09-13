import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, MapPin, X, ArrowRight, ShieldAlert,
  Radio, Clock, Volume2, VolumeX, CheckCircle2, Navigation
} from 'lucide-react';
import { useSocket } from '../../hooks/useSocket';

// Play an emergency audio alarm via Web Audio API
const playEmergencyPing = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // Beep 1
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.exponentialRampToValueAtTime(1320, now + 0.12);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.2);

    // Beep 2 (higher urgency)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(1174, now + 0.22);
    osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.36);
    gain2.gain.setValueAtTime(0.35, now + 0.22);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.42);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.22);
    osc2.stop(now + 0.45);
  } catch {
    // AudioContext blocked by browser autoplay policy until user gesture
  }
};

export const IncidentAlertModal = () => {
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [activeAlert, setActiveAlert] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);

  // Request browser desktop notification permission once on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const s = socket?.current || socket;

    const handleIncident = (data) => {
      if (!data) return;
      const id = data._id || data.id || `inc-${Date.now()}`;

      playEmergencyPing();

      const type = (data.incident_type || data.type || data.title || 'Hazard').replace(/_/g, ' ').toUpperCase();
      const road = data.road_name || data.road_segment_id?.road_name || data.road || 'NER Corridor';
      const district = data.district || data.road_segment_id?.district || 'North East Region';
      const blockage = (data.road_block || data.blockage || 'partial').toLowerCase();
      const officer = data.field_officer_name || data.reportedBy || data.officer || 'Field Officer';
      const slope = data.slope ?? data.slope_deg;
      const rain = data.rainfall_mm ?? data.rainfall;
      const description = data.description || data.message || `Immediate road hazard reported on ${road}. Proceed with caution or follow detour.`;

      // Safely extract coordinates — handle GeoJSON [lon,lat], plain fields, and transposed values
      let lat, lon;
      const geoCoords = data.location?.coordinates;
      if (Array.isArray(geoCoords) && geoCoords.length >= 2) {
        // GeoJSON stores [longitude, latitude]
        lon = parseFloat(geoCoords[0]);
        lat = parseFloat(geoCoords[1]);
      } else {
        lat = parseFloat(data.latitude ?? data.lat ?? 0);
        lon = parseFloat(data.longitude ?? data.lon ?? 0);
      }
      // Sanity-check: swap if values look transposed (lat for NE India is ~20–30)
      if (!isFinite(lat) || !isFinite(lon) || (Math.abs(lon) <= 90 && Math.abs(lat) > Math.abs(lon) && Math.abs(lat) > 90)) {
        [lat, lon] = [lon, lat];
      }
      // Final fallback to NE India centre if still invalid
      if (!isFinite(lat) || lat === 0) lat = 25.5;
      if (!isFinite(lon) || lon === 0) lon = 92.5;

      const alertObj = {
        id,
        type,
        road,
        district,
        blockage,
        officer,
        slope,
        rain,
        description,
        lat,
        lon,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setActiveAlert(alertObj);

      // Desktop system notification
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(`🚨 Emergency Hazard Alert: ${type}`, {
            body: `${road} (${district}) — Blockage: ${blockage.toUpperCase()}`,
            icon: '/favicon.ico',
          });
        } catch { /* browser block */ }
      }
    };

    if (s && typeof s.on === 'function') {
      s.on('incident_created', handleIncident);
      s.on('alert_created', handleIncident);
    }

    // Local custom event listener for immediate form submissions or test triggers
    const onCustomIncident = (e) => {
      if (e.detail) handleIncident(e.detail);
    };
    window.addEventListener('incident_created', onCustomIncident);
    window.addEventListener('incident_reported', onCustomIncident);

    return () => {
      if (s && typeof s.off === 'function') {
        s.off('incident_created', handleIncident);
        s.off('alert_created', handleIncident);
      }
      window.removeEventListener('incident_created', onCustomIncident);
      window.removeEventListener('incident_reported', onCustomIncident);
    };
  }, [socket]);

  // Auto-dismiss after 14 seconds unless hovered
  useEffect(() => {
    if (!activeAlert) return;
    if (isPaused) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    timerRef.current = setTimeout(() => {
      setActiveAlert(null);
    }, 14000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activeAlert, isPaused]);

  if (!activeAlert) return null;

  const isFullBlock = activeAlert.blockage === 'full';

  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 999999,
        width: 'calc(100vw - 32px)',
        maxWidth: 340,
        pointerEvents: 'auto',
        animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        style={{
          background: 'var(--surface, #ffffff)',
          borderRadius: 10,
          boxShadow: '0 10px 28px rgba(220, 38, 38, 0.25), 0 4px 10px rgba(0, 0, 0, 0.10)',
          border: '1.5px solid #ef4444',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Urgent Header Banner — compact */}
        <div
          style={{
            background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
            padding: '6px 10px',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#ffffff',
                boxShadow: '0 0 6px #ffffff',
                display: 'inline-block',
                animation: 'pulse-danger 1.5s infinite',
                flexShrink: 0,
              }}
            />
            <Radio size={11} className="spin" />
            <span style={{ fontSize: '0.67rem', fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              LIVE HAZARD ALERT
            </span>
            <span style={{ fontSize: '0.63rem', opacity: 0.82, display: 'flex', alignItems: 'center', gap: 2, marginLeft: 2 }}>
              <Clock size={9} /> {activeAlert.time}
            </span>
          </div>

          <button
            onClick={() => setActiveAlert(null)}
            style={{
              background: 'rgba(255, 255, 255, 0.18)',
              border: 'none',
              borderRadius: '50%',
              width: 20,
              height: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#ffffff',
              transition: 'background 0.15s',
              flexShrink: 0,
            }}
            title="Dismiss Alert"
          >
            <X size={12} />
          </button>
        </div>

        {/* Content Body — compact */}
        <div style={{ padding: '9px 11px' }}>
          {/* Headline & Blockage Badge */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--ink, #0f172a)', lineHeight: 1.2 }}>
                {activeAlert.type}
              </div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#dc2626', marginTop: 2, display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                <MapPin size={11} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>{activeAlert.road}</span>
                <span style={{ color: 'var(--text-secondary, #64748b)', fontWeight: 500, flexShrink: 0 }}>· {activeAlert.district}</span>
              </div>
            </div>

            <span
              style={{
                fontSize: '0.6rem',
                fontWeight: 800,
                padding: '2px 5px',
                borderRadius: 4,
                background: isFullBlock ? '#fee2e2' : '#fef3c7',
                color: isFullBlock ? '#b91c1c' : '#b45309',
                border: `1px solid ${isFullBlock ? '#f87171' : '#f59e0b'}`,
                whiteSpace: 'nowrap',
                textTransform: 'uppercase',
                flexShrink: 0,
              }}
            >
              {isFullBlock ? '⛔ Blocked' : '⚠️ Partial'}
            </span>
          </div>

          {/* Description */}
          <div style={{ fontSize: '0.71rem', color: 'var(--text-secondary, #475569)', lineHeight: 1.38, marginTop: 5 }}>
            {activeAlert.description}
          </div>

          {/* Geotechnical Quick Badges */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 6,
              padding: '4px 7px',
              borderRadius: 6,
              background: 'var(--surface-elevated, #f8fafc)',
              border: '1px solid var(--line, #e2e8f0)',
              fontSize: '0.65rem',
              color: 'var(--text-secondary, #64748b)',
              flexWrap: 'wrap',
            }}
          >
            {activeAlert.slope != null && (
              <span>🏔 <strong style={{ color: 'var(--ink, #0f172a)' }}>{activeAlert.slope}°</strong></span>
            )}
            {activeAlert.rain != null && (
              <span>🌧 <strong style={{ color: 'var(--ink, #0f172a)' }}>{activeAlert.rain}mm</strong></span>
            )}
            <span>👤 <strong style={{ color: 'var(--ink, #0f172a)' }}>{activeAlert.officer}</strong></span>
          </div>

          {/* Action links — plain text, no button box */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            {/* "View" deep-links into /planner with exact incident coords */}
            <button
              onClick={() => {
                setActiveAlert(null);
                const locStr = [activeAlert.road, activeAlert.district].filter(Boolean).join(', ');
                navigate(
                  `/planner?focusLat=${activeAlert.lat}&focusLon=${activeAlert.lon}` +
                  `&incidentId=${encodeURIComponent(activeAlert.id)}` +
                  `&incidentLoc=${encodeURIComponent(locStr)}` +
                  `&incidentType=${encodeURIComponent(activeAlert.type)}` +
                  `&desc=${encodeURIComponent(activeAlert.description)}` +
                  `&zoom=16`
                );
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                color: '#2563eb',
                fontSize: '0.72rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
              }}
            >
              <MapPin size={11} /> View
            </button>

            <button
              onClick={() => {
                setActiveAlert(null);
                navigate('/incidents');
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                color: 'var(--text-secondary, #64748b)',
                fontSize: '0.72rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
              }}
            >
              All Incidents <ArrowRight size={11} />
            </button>
          </div>
        </div>

        {/* Auto-Dismiss Progress Bar */}
        <div style={{ height: 3, width: '100%', background: '#fee2e2' }}>
          <div
            style={{
              height: '100%',
              background: '#ef4444',
              width: isPaused ? '100%' : '0%',
              transition: isPaused ? 'none' : 'width 14s linear',
            }}
          />
        </div>
      </div>
    </div>
  );
};
