import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, MapPin, X, ArrowRight, ShieldAlert, Radio, Clock } from 'lucide-react';
import { useSocket } from '../../hooks/useSocket';

// Play an emergency audio ping via Web Audio API
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
    osc1.frequency.setValueAtTime(880, now); // A5
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
    osc2.frequency.setValueAtTime(1174, now + 0.22); // D6
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
  const seenIncidentIds = useRef(new Set());

  // Request browser notification permission once
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const s = socket.current;
    if (!s) return;

    const handleIncident = (data) => {
      if (!data) return;
      const id = data._id || data.id || `inc-${Date.now()}`;
      if (seenIncidentIds.current.has(id)) return;
      seenIncidentIds.current.add(id);

      playEmergencyPing();

      const type = (data.incident_type || data.type || 'Hazard').replace(/_/g, ' ').toUpperCase();
      const road = data.road_name || data.road_segment_id?.road_name || 'NER Corridor';
      const district = data.district || data.road_segment_id?.district || 'North East Region';
      const blockage = data.road_block || 'partial';
      const officer = data.field_officer_name || data.reportedBy || 'Field Officer';
      const slope = data.slope ?? data.slope_deg;
      const rain = data.rainfall_mm;
      const description = data.description || `Immediate road hazard reported on ${road}. Proceed with caution or seek detour.`;
      const lat = data.location?.coordinates?.[1] || data.latitude || 25.5;
      const lon = data.location?.coordinates?.[0] || data.longitude || 92.5;

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
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };

      setActiveAlert(alertObj);

      // Desktop notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`🚨 Emergency Incident: ${type}`, {
          body: `${road} (${district}) — Blockage: ${blockage.toUpperCase()}`,
          icon: '/favicon.ico',
        });
      }
    };

    s.on('incident_created', handleIncident);
    return () => {
      s.off('incident_created', handleIncident);
    };
  }, [socket]);

  if (!activeAlert) return null;

  const isFullBlockage = activeAlert.blockage === 'full';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'popoverFadeIn 0.2s ease',
      }}
      onClick={() => setActiveAlert(null)}
    >
      <div
        style={{
          background: 'var(--white, #ffffff)',
          borderRadius: 18,
          boxShadow: '0 25px 70px rgba(220, 38, 38, 0.35), 0 10px 30px rgba(0,0,0,0.25)',
          border: '2px solid #ef4444',
          maxWidth: 520,
          width: '100%',
          overflow: 'hidden',
          animation: 'scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Urgent Pulsing Banner Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
            padding: '20px 24px',
            color: '#fff',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '3px 9px',
                  borderRadius: 20,
                  background: 'rgba(255,255,255,0.22)',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                <Radio size={12} className="spin" /> Real-Time Live Alert
              </span>
              <span style={{ fontSize: '0.72rem', opacity: 0.85, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={11} /> {activeAlert.time}
              </span>
            </div>

            <button
              onClick={() => setActiveAlert(null)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '50%',
                width: 28,
                height: 28,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <X size={15} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={24} color="#fef08a" />
            </div>
            <div>
              <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.9, fontWeight: 700 }}>
                Incident Reported
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, lineHeight: 1.2 }}>
                {activeAlert.type}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '22px 24px' }}>
          {/* Location & Blockage Highlight */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 10,
              background: '#fef2f2',
              border: '1px solid #fecaca',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '0.72rem', color: '#991b1b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Corridor Location
              </div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b', marginTop: 2 }}>
                {activeAlert.road}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                {activeAlert.district}
              </div>
            </div>

            <span
              style={{
                fontSize: '0.74rem',
                fontWeight: 800,
                padding: '4px 10px',
                borderRadius: 8,
                background: isFullBlockage ? '#ef4444' : '#f97316',
                color: '#fff',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                boxShadow: '0 2px 6px rgba(239,68,68,0.3)',
              }}
            >
              {isFullBlockage ? 'Road Blocked' : `${activeAlert.blockage} Block`}
            </span>
          </div>

          {/* Description */}
          <p style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.55, margin: '0 0 16px' }}>
            {activeAlert.description}
          </p>

          {/* Geotechnical metrics & Officer info */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10,
              marginBottom: 20,
              padding: '12px 14px',
              borderRadius: 10,
              background: 'var(--surface, #f8fafc)',
              border: '1px solid var(--line, #e2e8f0)',
            }}
          >
            <div>
              <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Reporter</div>
              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                {activeAlert.officer}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Hazard Metrics</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#b91c1c', marginTop: 2 }}>
                {activeAlert.slope != null ? `Slope: ${activeAlert.slope}°` : ''}
                {activeAlert.slope != null && activeAlert.rain != null ? ' · ' : ''}
                {activeAlert.rain != null ? `Rain: ${activeAlert.rain}mm` : ''}
                {activeAlert.slope == null && activeAlert.rain == null && 'High Hazard Risk'}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => {
                setActiveAlert(null);
                navigate('/route-planner');
              }}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 8,
                background: 'linear-gradient(135deg, #0284c7, #0ea5e9)',
                color: '#fff',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.84rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                boxShadow: '0 4px 12px rgba(14,165,233,0.35)',
              }}
            >
              <MapPin size={15} /> View on Map
            </button>

            <button
              onClick={() => {
                setActiveAlert(null);
                navigate('/incidents');
              }}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 8,
                background: '#f1f5f9',
                color: '#0f172a',
                border: '1px solid #cbd5e1',
                fontWeight: 700,
                fontSize: '0.84rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              Incident List <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
