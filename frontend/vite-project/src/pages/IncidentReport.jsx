/**
 * IncidentReport.jsx  — /incident-report
 *
 * Field Officer Incident Reporting Portal:
 *  • GPS auto-fill (with one-click Haflong/NER demo hotspots & manual overrides)
 *  • Field photo capture with AI Vision analysis (powered by Google Gemini)
 *  • Dropdown: Incident Type (Landslide, Rockfall, Flood, etc.)
 *  • Dropdown: Severity (Critical, High, Medium, Low)
 *  • Dropdown: Road Block condition (Full, Partial, None)
 *  • Dropdown: Traffic Condition (Blocked, Jammed, Slow, Clear)
 *  • Field inputs: Current Temperature (°C), Slope Angle (°), Rainfall (mm)
 *  • Submits to POST /api/road-incidents (multipart/form-data)
 *  • Multi-factor ML prediction updates road segment risk in MongoDB & triggers live reroute push!
 */

import { useState, useEffect, useRef } from 'react';
import {
  Camera, MapPin, Send, Loader, CheckCircle, AlertTriangle, RefreshCw,
  Thermometer, Mountain, ShieldAlert, Car, CloudRain, Navigation, Check
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import toast from 'react-hot-toast';
import { auth, BASE_URL, ensureToken } from '../services/api';

// Always use the Vite proxy path in dev, or the real API_URL in prod
// This ensures the auth header is sent correctly through the proxy
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const HAZARD_TO_TYPE = {
  landslide:   'LANDSLIDE',
  flood:       'FLOOD',
  road_damage: 'ROAD_DAMAGE',
  rockfall:    'ROCKFALL',
  fallen_tree: 'FALLEN_TREE',
};

const INCIDENT_TYPES = [
  { value: 'LANDSLIDE',       label: '⛰ Landslide' },
  { value: 'ROCKFALL',        label: '🪨 Rockfall' },
  { value: 'FLOOD',           label: '🌊 Flash Flood' },
  { value: 'ROAD_DAMAGE',     label: '🚧 Road Damage' },
  { value: 'FALLEN_TREE',     label: '🌲 Fallen Tree / Debris' },
  { value: 'BRIDGE_DAMAGE',   label: '🌉 Bridge Damage' },
  { value: 'VISIBILITY_LOW',  label: '🌫 Low Visibility' },
  { value: 'OTHER',           label: '⚠ Other Hazard' },
];

const SEVERITY_OPTS = [
  { value: 'critical', label: '🔴 Critical', color: '#dc2626', bg: '#fef2f2' },
  { value: 'high',     label: '🟠 High',     color: '#ea580c', bg: '#fff7ed' },
  { value: 'medium',   label: '🟡 Medium',   color: '#d97706', bg: '#fffbeb' },
  { value: 'low',      label: '🟢 Low',      color: '#16a34a', bg: '#f0fdf4' },
];

const ROAD_BLOCK_OPTS = [
  { value: 'high',    label: '⛔ High Road Block (100% Closed / Impassable)', desc: 'Both lanes blocked, all vehicle movement stopped' },
  { value: 'medium',  label: '⚠️ Medium Road Block (Partial / 1 Lane Open)',  desc: 'Single lane alternate traffic flow with delays' },
  { value: 'low',     label: '🟢 Low Road Block (Minor / Clear Passable)',    desc: 'Shoulder debris only, roadway is navigable' },
];

const TRAFFIC_OPTS = [
  { value: 'blocked',    label: '🚫 Standstill / Blocked (Traffic Halted)', desc: 'Vehicles trapped or halted completely' },
  { value: 'jammed',     label: '🔴 Heavy Congestion / Jammed',             desc: 'Severe delays, bumper-to-bumper queue' },
  { value: 'slow',       label: '🟡 Slow Moving Traffic',                   desc: 'Reduced speed, single-lane movement' },
  { value: 'clear',      label: '🟢 Clear / Flowing Normally',              desc: 'Unimpeded vehicle movement' },
];

// Quick hotspots in Dima Hasao & NER for testing
const DEMO_HOTSPOTS = [
  { label: 'Haflong (SH-5)',      lat: 25.1450, lon: 93.0100, slope: 32, temp: 22, rain: 112 },
  { label: 'Dima Hasao Spur',    lat: 25.1101, lon: 92.9988, slope: 18, temp: 23, rain: 74 },
  { label: 'Silchar Pass',       lat: 24.8680, lon: 92.8100, slope: 24, temp: 26, rain: 88 },
  { label: 'Jiribam Ridge',      lat: 24.8080, lon: 93.5200, slope: 26, temp: 25, rain: 105 },
];

export const IncidentReport = () => {
  const [coords, setCoords]           = useState(null);
  const [gpsStatus, setGpsStatus]     = useState('requesting'); // requesting | granted | denied
  const [manualLat, setManualLat]     = useState('25.1450');
  const [manualLon, setManualLon]     = useState('93.0100');

  // Form fields
  const [incidentType, setType]       = useState('LANDSLIDE');
  const [severity, setSeverity]       = useState('high');
  const [roadBlock, setRoadBlock]     = useState('high');
  const [trafficCondition, setTraffic]= useState('blocked');
  const [currentTemp, setCurrentTemp] = useState('23');
  const [slope, setSlope]             = useState('32');
  const [rainfall, setRainfall]       = useState('95');
  const [description, setDesc]        = useState('');

  // Photo state
  const [photo, setPhoto]             = useState(null);
  const [photoPreview, setPreview]    = useState(null);
  const [photoAnalysis, setAnalysis]  = useState(null);
  const [analyzing, setAnalyzing]     = useState(false);

  // Submission state
  const [submitting, setSubmitting]   = useState(false);
  const [result, setResult]           = useState(null);
  const fileRef = useRef();

  // Acquire GPS on mount
  const detectLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus('denied');
      return;
    }
    setGpsStatus('requesting');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude, acc: pos.coords.accuracy });
        setManualLat(pos.coords.latitude.toFixed(4));
        setManualLon(pos.coords.longitude.toFixed(4));
        setGpsStatus('granted');
        toast.success('GPS coordinates locked!', { icon: '📍' });
      },
      () => {
        setGpsStatus('denied');
        // Default to Haflong / Dima Hasao
        setManualLat('25.1450');
        setManualLon('93.0100');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  useEffect(() => {
    detectLocation();
  }, []);

  const handleSelectHotspot = (spot) => {
    setManualLat(spot.lat.toFixed(4));
    setManualLon(spot.lon.toFixed(4));
    setSlope(String(spot.slope));
    setCurrentTemp(String(spot.temp));
    setRainfall(String(spot.rain));
    toast(`📍 Applied ${spot.label} parameters`, { duration: 3000 });
  };

  const handlePhoto = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhoto(f);
    setAnalysis(null);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(f);

    // Auto-analyze photo via backend Gemini Vision endpoint
    const token = await ensureToken();
    setAnalyzing(true);
    try {
      const form = new FormData();
      form.append('photo', f);
      const res = await fetch(`${API_BASE}/api/analyze-photo`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      const data = await res.json();
      if (data.success) {
        setAnalysis(data);
        if (data.derived_severity && data.derived_severity !== 'unknown') {
          setSeverity(data.derived_severity);
        }
        if (data.vision_analysis?.hazard_type && HAZARD_TO_TYPE[data.vision_analysis.hazard_type]) {
          setType(HAZARD_TO_TYPE[data.vision_analysis.hazard_type]);
        }
        if (data.vision_analysis?.road_blocked != null) {
          setRoadBlock(data.vision_analysis.road_blocked ? 'full' : 'partial');
          setTraffic(data.vision_analysis.road_blocked ? 'blocked' : 'slow');
        }
        toast.success('AI Vision analyzed photo!', { icon: '🤖' });
      }
    } catch {
      /* silent */
    } finally {
      setAnalyzing(false);
    }
  };

  const usedLat = parseFloat(manualLat) || (coords?.lat ?? 25.1450);
  const usedLon = parseFloat(manualLon) || (coords?.lon ?? 93.0100);

  // Load a bundled demo landslide photo for testing without a real camera
  const loadDemoPhoto = async () => {
    try {
      // Use a public-domain landslide image via fetch
      const imgUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/A_small_cup_of_coffee.JPG/640px-A_small_cup_of_coffee.JPG';
      // We'll create a synthetic File from a blank canvas as a placeholder
      // (avoids CORS issues with external images)
      const canvas = document.createElement('canvas');
      canvas.width = 640; canvas.height = 480;
      const ctx = canvas.getContext('2d');
      // Draw a landslide-colored placeholder
      const grad = ctx.createLinearGradient(0, 0, 640, 480);
      grad.addColorStop(0, '#8B4513'); grad.addColorStop(0.4, '#A0522D');
      grad.addColorStop(0.7, '#654321'); grad.addColorStop(1, '#3d2b1f');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 640, 480);
      ctx.fillStyle = '#5a3e2b';
      for (let i = 0; i < 40; i++) {
        ctx.fillRect(Math.random()*620, Math.random()*460, 8+Math.random()*30, 4+Math.random()*15);
      }
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('DEMO · Landslide Site Photo', 60, 240);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const file = new File([blob], 'demo-landslide.jpg', { type: 'image/jpeg' });
        setPhoto(file);
        setAnalysis(null);
        const reader = new FileReader();
        reader.onload = (ev) => setPreview(ev.target.result);
        reader.readAsDataURL(file);
        // Trigger AI analysis
        const syntheticEvent = { target: { files: [file] } };
        handlePhoto(syntheticEvent);
      }, 'image/jpeg', 0.92);

      toast('📸 Demo photo loaded — AI analyzing…', { duration: 3000 });
    } catch (err) {
      toast.error('Failed to load demo photo: ' + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isNaN(usedLat) || isNaN(usedLon)) {
      toast.error('Valid GPS coordinates required');
      return;
    }

    // Get or silently refresh auth token
    const token = await ensureToken();
    if (!token) {
      toast.error('Unable to authenticate. Please log in first.');
      return;
    }

    setSubmitting(true);
    setResult(null);

    try {
      const form = new FormData();
      form.append('lat',                 usedLat);
      form.append('lon',                 usedLon);
      form.append('incident_type',       incidentType.toLowerCase());
      form.append('reported_risk_level', severity.toLowerCase());
      form.append('road_block',          roadBlock.toLowerCase());
      form.append('traffic_condition',   trafficCondition.toLowerCase());
      form.append('current_temp',        parseFloat(currentTemp) || 24);
      form.append('slope',               parseFloat(slope) || 20);
      form.append('slope_deg',           parseFloat(slope) || 20);
      form.append('rainfall_mm',         parseFloat(rainfall) || 80);
      form.append('description',         description || `${incidentType} reported by field officer. Road block: ${roadBlock}.`);
      if (photo) form.append('photo', photo);

      const res = await fetch(`${API_BASE}/api/road-incidents`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Submission failed');

      setResult(data);
      toast.success('Incident reported! Live maps & reroutes triggered.', { duration: 6000, icon: '🚨' });

      // Reset photo & notes, keep coordinates
      setPhoto(null);
      setPreview(null);
      setDesc('');
    } catch (err) {
      toast.error(err.message || 'Failed to submit incident report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 0 50px' }}>
      <PageHeader
        title="Field Incident Reporter"
        description="Field Officer · Real-time Hazard Logging · AI Vision Analysis · Automatic Vehicle Rerouting"
      />

      {/* GPS & Location Hub */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.88rem' }}>
            <MapPin size={16} color="var(--accent)" /> Incident Coordinates
          </div>
          <button
            type="button"
            onClick={detectLocation}
            style={{
              padding: '3px 10px', fontSize: '0.72rem', fontWeight: 600,
              background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe',
              borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <Navigation size={12} /> Detect GPS
          </button>
        </div>

        {/* Coordinate Inputs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', marginBottom: 4 }}>
              Latitude
            </label>
            <input
              type="number"
              step="any"
              className="form-control"
              value={manualLat}
              onChange={(e) => setManualLat(e.target.value)}
              placeholder="e.g. 25.1450"
              style={{ fontSize: '0.85rem' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', marginBottom: 4 }}>
              Longitude
            </label>
            <input
              type="number"
              step="any"
              className="form-control"
              value={manualLon}
              onChange={(e) => setManualLon(e.target.value)}
              placeholder="e.g. 93.0100"
              style={{ fontSize: '0.85rem' }}
            />
          </div>
        </div>

        {/* Quick Demo Location Hotspots */}
        <div style={{ fontSize: '0.72rem', color: 'var(--slate)', marginBottom: 6, fontWeight: 600 }}>
          Quick Hotspots in Disaster Zones:
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {DEMO_HOTSPOTS.map((spot) => (
            <button
              key={spot.label}
              type="button"
              onClick={() => handleSelectHotspot(spot)}
              style={{
                padding: '3px 8px', fontSize: '0.7rem', fontWeight: 600,
                background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1',
                borderRadius: 5, cursor: 'pointer',
              }}
            >
              📍 {spot.label}
            </button>
          ))}
        </div>
      </div>

      {/* Submission Result / Confirmation */}
      {result && (
        <div style={{
          padding: '16px', borderRadius: 10, marginBottom: 18,
          background: '#f0fdf4', border: '1.5px solid #86efac',
          boxShadow: '0 4px 14px rgba(22,163,74,0.12)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <CheckCircle size={20} color="#16a34a" />
            <span style={{ fontWeight: 800, color: '#15803d', fontSize: '0.95rem' }}>
              Incident Submitted &amp; Live Reroute Triggered!
            </span>
          </div>
          {result.snapped_segment && (
            <div style={{ fontSize: '0.88rem', color: '#1f2937', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span>🛣 Snapped to Road: <strong>{result.snapped_segment.road_name}</strong>{result.snapped_segment.district && ` (${result.snapped_segment.district})`}</span>
              <span style={{
                background: result.prediction?.predicted_risk_level === 'high' ? '#fee2e2' : '#fef3c7',
                color: result.prediction?.predicted_risk_level === 'high' ? '#dc2626' : '#b45309',
                border: `1.5px solid ${result.prediction?.predicted_risk_level === 'high' ? '#f87171' : '#fde047'}`,
                padding: '2px 8px', borderRadius: 5, fontSize: '0.75rem', fontWeight: 900,
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>
                {result.prediction?.predicted_risk_level === 'high' ? '🔴 RED' : '🟡 YELLOW'} (NEW)
              </span>
            </div>
          )}
          {result.prediction && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <span style={{
                display: 'inline-block', padding: '3px 10px',
                borderRadius: 6, fontSize: '0.8rem', fontWeight: 800,
                background: result.prediction.predicted_risk_level === 'high' ? '#fef2f2' : '#fffbeb',
                color: result.prediction.predicted_risk_level === 'high' ? '#dc2626' : '#b45309',
                border: `1px solid ${result.prediction.predicted_risk_level === 'high' ? '#fca5a5' : '#fde68a'}`,
              }}>
                ML Prediction: {result.prediction.predicted_risk_level?.toUpperCase()} RISK (Score: {result.prediction.predicted_risk_score?.toFixed(2)})
              </span>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                Model: {result.prediction.model_version}
              </span>
            </div>
          )}
          <div style={{ fontSize: '0.78rem', color: '#15803d', lineHeight: 1.5, background: '#dcfce7', padding: '8px 10px', borderRadius: 6, marginBottom: 10 }}>
            ✓ Road is now colored <strong>{result.prediction?.predicted_risk_level === 'high' ? 'RED' : 'YELLOW'}</strong> on all maps with a visible <strong>(NEW)</strong> label.<br />
            ✓ Real-time Socket broadcast sent to Route Planner and Dashboard.<br />
            ✓ Vehicles scheduled on this road received an automatic <strong>reroute_push</strong> detour!
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a
              href="/incidents"
              style={{
                fontSize: '0.8rem', background: '#dc2626', color: '#ffffff',
                border: 'none', borderRadius: 6, padding: '6px 14px',
                textDecoration: 'none', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4,
              }}
            >
              🚨 View in Incidents Feed →
            </a>
            <a
              href="/roads"
              style={{
                fontSize: '0.8rem', background: '#d97706', color: '#ffffff',
                border: 'none', borderRadius: 6, padding: '6px 14px',
                textDecoration: 'none', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4,
              }}
            >
              🛣 View in Roads Feed →
            </a>
            <a
              href="/route-planner"
              style={{
                fontSize: '0.8rem', background: '#2563eb', color: '#ffffff',
                border: 'none', borderRadius: 6, padding: '6px 14px',
                textDecoration: 'none', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4,
              }}
            >
              🗺 View on Route Planner Map →
            </a>
            <button
              type="button"
              onClick={() => setResult(null)}
              style={{
                fontSize: '0.8rem', background: '#ffffff',
                border: '1px solid #86efac', borderRadius: 6, padding: '6px 14px',
                cursor: 'pointer', color: '#166534', fontWeight: 700,
              }}
            >
              + Report Another Incident
            </button>
          </div>
        </div>
      )}

      {/* Main Incident Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Photo Upload with Gemini Vision */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Camera size={16} color="var(--sky)" /> Site Photo &amp; AI Vision
          </div>
          {photoPreview ? (
            <div style={{ position: 'relative' }}>
              <img src={photoPreview} alt="preview" style={{ width: '100%', maxHeight: 240, objectFit: 'cover' }} />
              <button
                type="button"
                onClick={() => { setPhoto(null); setPreview(null); setAnalysis(null); if (fileRef.current) fileRef.current.value = ''; }}
                style={{
                  position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.65)',
                  color: '#fff', border: 'none', borderRadius: '50%', width: 28, height: 28,
                  cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >✕</button>

              {analyzing && (
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: 'rgba(0,0,0,0.7)', padding: '8px 14px',
                  display: 'flex', alignItems: 'center', gap: 8, color: '#fff', fontSize: '0.8rem',
                }}>
                  <Loader size={14} className="spin" /> Gemini AI analyzing photo features…
                </div>
              )}

              {!analyzing && photoAnalysis && (
                <div style={{ padding: '8px 12px', background: '#f0fdf4', borderTop: '1px solid #86efac' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>🤖 AI Analysis:</span>
                    {photoAnalysis.vision_analysis ? (
                      <>
                        <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#15803d' }}>
                          {photoAnalysis.vision_analysis.hazard_type?.replace(/_/g, ' ')}
                        </span>
                        <span style={{
                          padding: '1px 8px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 800,
                          background: photoAnalysis.derived_severity === 'high' ? '#fef2f2' : '#fffbeb',
                          color: photoAnalysis.derived_severity === 'high' ? '#dc2626' : '#b45309',
                          border: `1px solid ${photoAnalysis.derived_severity === 'high' ? '#fca5a5' : '#fde68a'}`,
                        }}>
                          {photoAnalysis.derived_severity?.toUpperCase()}
                        </span>
                        {photoAnalysis.vision_analysis.confidence != null && (
                          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            ({Math.round(photoAnalysis.vision_analysis.confidence * 100)}% conf.)
                          </span>
                        )}
                        <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600 }}>
                          · Form auto-filled
                        </span>
                      </>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Heuristic analysis: <strong>{photoAnalysis.derived_severity}</strong>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                padding: '24px 20px', textAlign: 'center', cursor: 'pointer',
                background: '#f8fafc', color: '#64748b', fontSize: '0.84rem',
              }}
            >
              <Camera size={30} style={{ marginBottom: 6, opacity: 0.5 }} />
              <div style={{ fontWeight: 700 }}>Tap to capture or upload site photo</div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 2 }}>
                JPG, PNG · Gemini AI automatically identifies hazard, blockage &amp; severity
              </div>
              <div style={{ marginTop: 10 }}>
                <button
                  type="button"
                  id="btn-load-demo-photo"
                  onClick={(e) => { e.stopPropagation(); loadDemoPhoto(); }}
                  style={{
                    padding: '6px 14px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    background: '#eff6ff',
                    color: '#2563eb',
                    border: '1.5px solid #bfdbfe',
                    borderRadius: 6,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  📸 Use Field Photo (Landslide Hazard)
                </button>
              </div>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} style={{ display: 'none' }} />
        </div>

        {/* Hazard Classification Grid */}
        <div className="card">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* Incident Type */}
            <div>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.75rem', color: 'var(--slate)', textTransform: 'uppercase', marginBottom: 6 }}>
                Incident Type
              </label>
              <select
                className="form-control"
                value={incidentType}
                onChange={(e) => setType(e.target.value)}
                style={{ fontSize: '0.85rem', width: '100%' }}
              >
                {INCIDENT_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Severity / Risk Level */}
            <div>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.75rem', color: 'var(--slate)', textTransform: 'uppercase', marginBottom: 6 }}>
                Reported Severity
              </label>
              <select
                className="form-control"
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                style={{ fontSize: '0.85rem', width: '100%' }}
              >
                {SEVERITY_OPTS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Road Block & Traffic Condition (Requested Dropdowns) */}
        <div className="card">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* Road Block Dropdown */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700, fontSize: '0.75rem', color: 'var(--slate)', textTransform: 'uppercase', marginBottom: 6 }}>
                <ShieldAlert size={13} color="var(--danger)" /> Road Block Level
              </label>
              <select
                className="form-control"
                value={roadBlock}
                onChange={(e) => setRoadBlock(e.target.value)}
                style={{ fontSize: '0.85rem', width: '100%' }}
              >
                {ROAD_BLOCK_OPTS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Traffic Condition Dropdown */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700, fontSize: '0.75rem', color: 'var(--slate)', textTransform: 'uppercase', marginBottom: 6 }}>
                <Car size={13} color="var(--sky)" /> Traffic Condition
              </label>
              <select
                className="form-control"
                value={trafficCondition}
                onChange={(e) => setTraffic(e.target.value)}
                style={{ fontSize: '0.85rem', width: '100%' }}
              >
                {TRAFFIC_OPTS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Sensor & Terrain Metrics (Temperature, Slope, Rainfall) */}
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: '0.75rem', color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
            Terrain &amp; Weather Metrics
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {/* Current Temp */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', fontWeight: 600, color: 'var(--slate)', marginBottom: 4 }}>
                <Thermometer size={12} color="#f97316" /> Temp (°C)
              </label>
              <input
                type="number"
                step="0.5"
                className="form-control"
                value={currentTemp}
                onChange={(e) => setCurrentTemp(e.target.value)}
                style={{ fontSize: '0.85rem' }}
                placeholder="24"
              />
            </div>

            {/* Slope */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', fontWeight: 600, color: 'var(--slate)', marginBottom: 4 }}>
                <Mountain size={12} color="#8b5cf6" /> Slope (°)
              </label>
              <input
                type="number"
                step="1"
                className="form-control"
                value={slope}
                onChange={(e) => setSlope(e.target.value)}
                style={{ fontSize: '0.85rem' }}
                placeholder="28"
              />
            </div>

            {/* Rainfall */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', fontWeight: 600, color: 'var(--slate)', marginBottom: 4 }}>
                <CloudRain size={12} color="#0284c7" /> Rain (mm)
              </label>
              <input
                type="number"
                step="1"
                className="form-control"
                value={rainfall}
                onChange={(e) => setRainfall(e.target.value)}
                style={{ fontSize: '0.85rem' }}
                placeholder="85"
              />
            </div>
          </div>
        </div>

        {/* Description / Officer Notes */}
        <div className="card">
          <label style={{ display: 'block', fontWeight: 700, fontSize: '0.75rem', color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>
            Field Officer Observations
          </label>
          <textarea
            className="form-control"
            rows={3}
            placeholder="e.g. Active slope failure observed at km 28 marker. Debris blocking right lane. Emergency clearance crew dispatched."
            value={description}
            onChange={(e) => setDesc(e.target.value)}
            style={{ resize: 'vertical', fontSize: '0.85rem' }}
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          className="btn btn-primary"
          style={{
            width: '100%', padding: '14px', fontSize: '0.96rem', fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
            boxShadow: '0 4px 16px rgba(239, 68, 68, 0.35)',
            cursor: submitting ? 'not-allowed' : 'pointer',
          }}
        >
          {submitting ? (
            <><Loader size={17} className="spin" /> Evaluating Risk &amp; Submitting…</>
          ) : (
            <><Send size={17} /> Submit Incident &amp; Trigger Live Reroute</>
          )}
        </button>
      </form>
    </div>
  );
};
