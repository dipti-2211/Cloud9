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
      const lat = data.location?.coordinates?.[1] || data.latitude || data.lat || 25.5;
      const lon = data.location?.coordinates?.[0] || data.longitude || data.lon || 92.5;

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
        top: 20,
        right: 20,
        zIndex: 999999,
        width: 'calc(100vw - 40px)',
        maxWidth: 440,
        pointerEvents: 'auto',
        animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        style={{
          background: 'var(--surface, #ffffff)',
          borderRadius: 14,
          boxShadow: '0 16px 40px rgba(220, 38, 38, 0.35), 0 6px 16px rgba(0, 0, 0, 0.15)',
          border: '2px solid #ef4444',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Urgent Header Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
            padding: '10px 14px',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: '50%',
                background: '#ffffff',
                boxShadow: '0 0 8px #ffffff',
                display: 'inline-block',
                animation: 'pulse-danger 1.5s infinite',
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Radio size={13} className="spin" />
              <span style={{ fontSize: '0.74rem', fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                LIVE HAZARD ALERT
              </span>
            </div>
            <span style={{ fontSize: '0.7rem', opacity: 0.85, display: 'flex', alignItems: 'center', gap: 3, marginLeft: 4 }}>
              <Clock size={10} /> {activeAlert.time}
            </span>
          </div>

          <button
            onClick={() => setActiveAlert(null)}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#ffffff',
              transition: 'background 0.15s',
            }}
            title="Dismiss Alert"
          >
            <X size={14} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '14px 16px' }}>
          {/* Headline & Blockage Badge */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--ink, #0f172a)', lineHeight: 1.25 }}>
                {activeAlert.type}
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#dc2626', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={13} />
                <span>{activeAlert.road}</span>
                <span style={{ color: 'var(--text-secondary, #64748b)', fontWeight: 500 }}>· {activeAlert.district}</span>
              </div>
            </div>

            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 800,
                padding: '3px 8px',
                borderRadius: 6,
                background: isFullBlock ? '#fee2e2' : '#fef3c7',
                color: isFullBlock ? '#b91c1c' : '#b45309',
                border: `1px solid ${isFullBlock ? '#f87171' : '#f59e0b'}`,
                whiteSpace: 'nowrap',
                textTransform: 'uppercase',
              }}
            >
              {isFullBlock ? '⛔ Road Blocked' : '⚠️ Partial Block'}
            </span>
          </div>

          {/* Description */}
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #475569)', lineHeight: 1.45, marginTop: 8 }}>
            {activeAlert.description}
          </div>

          {/* Geotechnical Quick Badges */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginTop: 10,
              padding: '6px 10px',
              borderRadius: 8,
              background: 'var(--surface-elevated, #f8fafc)',
              border: '1px solid var(--line, #e2e8f0)',
              fontSize: '0.72rem',
              color: 'var(--text-secondary, #64748b)',
            }}
          >
            {activeAlert.slope != null && (
              <span>🏔 Slope: <strong style={{ color: 'var(--ink, #0f172a)' }}>{activeAlert.slope}°</strong></span>
            )}
            {activeAlert.rain != null && (
              <span>🌧 Rain: <strong style={{ color: 'var(--ink, #0f172a)' }}>{activeAlert.rain}mm</strong></span>
            )}
            <span>👤 Officer: <strong style={{ color: 'var(--ink, #0f172a)' }}>{activeAlert.officer}</strong></span>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button
              onClick={() => {
                setActiveAlert(null);
                navigate('/dashboard');
              }}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 8,
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                boxShadow: '0 2px 6px rgba(37,99,235,0.3)',
              }}
            >
              <MapPin size={13} /> View on Map
            </button>

            <button
              onClick={() => {
                setActiveAlert(null);
                navigate('/incidents');
              }}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 8,
                background: 'var(--surface-elevated, #f1f5f9)',
                color: 'var(--ink, #0f172a)',
                border: '1px solid var(--line, #cbd5e1)',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
              }}
            >
              Incident List <ArrowRight size={13} />
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
