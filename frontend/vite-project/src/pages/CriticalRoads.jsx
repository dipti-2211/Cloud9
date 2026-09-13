/**
 * CriticalRoads.jsx — /critical-roads
 *
 * Shows bridge edges in the NER road network whose removal disconnects
 * settlements from the main network. Sorted by settlement count descending.
 *
 * Data from GET /api/critical-roads (precomputed by risk-engine/scripts/critical_roads.py or MongoDB)
 */
import { useEffect, useState, Component } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AlertOctagon, RefreshCw, ChevronDown, ChevronUp, AlertTriangle, Trash2, X } from 'lucide-react';
import { getCriticalRoads, roadsAPI, auth } from '../services/api';
import { PageHeader } from '../components/common/PageHeader';
import { useSocket } from '../hooks/useSocket';
import toast from 'react-hot-toast';

// Error boundary to prevent entire page crashing if Leaflet encounters a rendering issue
class MapErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('CriticalRoads Map error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--danger)', background: 'var(--danger-bg)', borderRadius: 8 }}>
          <AlertTriangle size={32} style={{ marginBottom: 8 }} />
          <div style={{ fontWeight: 700 }}>Map display temporarily unavailable</div>
          <div style={{ fontSize: '0.8rem', marginTop: 4 }}>Please use the critical segments table on the left or refresh.</div>
          <button className="btn btn-secondary" onClick={() => this.setState({ hasError: false })} style={{ marginTop: 12 }}>
            Retry Map
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const RISK_COLORS = {
  high:   '#ef4444',
  medium: '#f97316',
  low:    '#eab308',
};
const segColor = (count) => count >= 2 ? RISK_COLORS.high : count === 1 ? RISK_COLORS.medium : RISK_COLORS.low;

const flyIcon = L.divIcon({
  className: 'risk-marker risk-marker-high',
  iconSize: [12, 12], iconAnchor: [6, 6],
});

/**
 * Robustly extract lat/lon polyline coordinates from a segment
 * Handles from_lat/from_lon, geometry.coordinates GeoJSON, path array, and midpoint offsets
 */
const getSegPositions = (seg) => {
  if (!seg) return null;

  // 1. Explicit lat/lon numbers
  if (
    typeof seg.from_lat === 'number' && typeof seg.from_lon === 'number' &&
    typeof seg.to_lat === 'number' && typeof seg.to_lon === 'number' &&
    !isNaN(seg.from_lat) && !isNaN(seg.from_lon) && !isNaN(seg.to_lat) && !isNaN(seg.to_lon) &&
    isFinite(seg.from_lat) && isFinite(seg.from_lon) && isFinite(seg.to_lat) && isFinite(seg.to_lon)
  ) {
    return [[seg.from_lat, seg.from_lon], [seg.to_lat, seg.to_lon]];
  }

  // 2. GeoJSON LineString coordinates: [[lon, lat], [lon, lat], ...]
  if (Array.isArray(seg.geometry?.coordinates) && seg.geometry.coordinates.length >= 2) {
    const coords = seg.geometry.coordinates
      .filter(pt => Array.isArray(pt) && typeof pt[0] === 'number' && typeof pt[1] === 'number' &&
                    !isNaN(pt[0]) && !isNaN(pt[1]) && isFinite(pt[0]) && isFinite(pt[1]))
      .map(([lon, lat]) => [lat, lon]); // GeoJSON [lon, lat] -> Leaflet [lat, lon]
    if (coords.length >= 2) return coords;
  }

  // 3. Predefined path array
  if (Array.isArray(seg.path) && seg.path.length >= 2) {
    const valid = seg.path.filter(pt => Array.isArray(pt) && typeof pt[0] === 'number' && typeof pt[1] === 'number' &&
                                       !isNaN(pt[0]) && !isNaN(pt[1]) && isFinite(pt[0]) && isFinite(pt[1]));
    if (valid.length >= 2) return valid;
  }

  // 4. Fallback: small synthetic segment around valid midpoint
  if (
    typeof seg.mid_lat === 'number' && typeof seg.mid_lon === 'number' &&
    !isNaN(seg.mid_lat) && !isNaN(seg.mid_lon) &&
    isFinite(seg.mid_lat) && isFinite(seg.mid_lon)
  ) {
    return [
      [seg.mid_lat - 0.015, seg.mid_lon - 0.015],
      [seg.mid_lat + 0.015, seg.mid_lon + 0.015],
    ];
  }

  return null;
};

/**
 * Returns a guaranteed [lat, lon] midpoint or null
 */
const getSegMidpoint = (seg) => {
  if (!seg) return null;
  if (
    typeof seg.mid_lat === 'number' && typeof seg.mid_lon === 'number' &&
    !isNaN(seg.mid_lat) && !isNaN(seg.mid_lon) &&
    isFinite(seg.mid_lat) && isFinite(seg.mid_lon)
  ) {
    return [seg.mid_lat, seg.mid_lon];
  }

  const pos = getSegPositions(seg);
  if (pos && pos.length >= 2) {
    const midLat = (pos[0][0] + pos[pos.length - 1][0]) / 2;
    const midLon = (pos[0][1] + pos[pos.length - 1][1]) / 2;
    if (!isNaN(midLat) && !isNaN(midLon) && isFinite(midLat) && isFinite(midLon)) {
      return [midLat, midLon];
    }
  }

  return null;
};

/** Flies map to selected segment safely */
const FlyTo = ({ lat, lon }) => {
  const map = useMap();
  useEffect(() => {
    if (
      typeof lat === 'number' && typeof lon === 'number' &&
      !isNaN(lat) && !isNaN(lon) &&
      isFinite(lat) && isFinite(lon)
    ) {
      try {
        map.flyTo([lat, lon], 11, { animate: true, duration: 0.8 });
      } catch (err) {
        console.warn('FlyTo error:', err.message);
      }
    }
  }, [lat, lon, map]);
  return null;
};

export const CriticalRoads = () => {
  const [segments,    setSegments]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [selected,    setSelected]    = useState(null);
  const [source,      setSource]      = useState('');
  const [expandedId,  setExpandedId]  = useState(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const data = await getCriticalRoads();
      const rawList = Array.isArray(data?.criticalRoads) ? data.criticalRoads : [];
      const normalized = rawList.map(s => {
        const c = Array.isArray(s.geometry?.coordinates) ? s.geometry.coordinates : [];
        const fromCoord = Array.isArray(c[0]) ? c[0] : [];
        const toCoord = Array.isArray(c[1]) ? c[1] : (Array.isArray(c[c.length - 1]) ? c[c.length - 1] : []);

        const from_lon = typeof s.from_lon === 'number' && !isNaN(s.from_lon) ? s.from_lon : (typeof fromCoord[0] === 'number' && !isNaN(fromCoord[0]) ? fromCoord[0] : null);
        const from_lat = typeof s.from_lat === 'number' && !isNaN(s.from_lat) ? s.from_lat : (typeof fromCoord[1] === 'number' && !isNaN(fromCoord[1]) ? fromCoord[1] : null);
        const to_lon   = typeof s.to_lon === 'number' && !isNaN(s.to_lon) ? s.to_lon : (typeof toCoord[0] === 'number' && !isNaN(toCoord[0]) ? toCoord[0] : null);
        const to_lat   = typeof s.to_lat === 'number' && !isNaN(s.to_lat) ? s.to_lat : (typeof toCoord[1] === 'number' && !isNaN(toCoord[1]) ? toCoord[1] : null);

        const mid_lat = typeof s.mid_lat === 'number' && !isNaN(s.mid_lat)
          ? s.mid_lat
          : (from_lat != null && to_lat != null ? parseFloat(((from_lat + to_lat) / 2).toFixed(5)) : 25.1);
        const mid_lon = typeof s.mid_lon === 'number' && !isNaN(s.mid_lon)
          ? s.mid_lon
          : (from_lon != null && to_lon != null ? parseFloat(((from_lon + to_lon) / 2).toFixed(5)) : 93.0);

        return {
          ...s,
          id: s.id || s.segment_key || s._id || `seg-${Math.random()}`,
          from_lat,
          from_lon,
          to_lat,
          to_lon,
          mid_lat,
          mid_lon,
          settlement_count: typeof s.settlement_count === 'number' ? s.settlement_count : (Array.isArray(s.settlements_cutoff) ? s.settlements_cutoff.length : 0),
          settlements_cutoff: Array.isArray(s.settlements_cutoff) ? s.settlements_cutoff : [],
        };
      });

      const sorted = normalized.sort((a, b) => b.settlement_count - a.settlement_count);
      setSegments(sorted);
      setSource(data?.source ?? '');
      if (sorted.length) setSelected(sorted[0]);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const { socket } = useSocket();
  const user = auth.getUser();
  const isAdmin = user?.role === 'ADMIN';

  const [deleteModalSeg, setDeleteModalSeg] = useState(null);
  const [deleteReason,   setDeleteReason]   = useState('Road reconstructed');
  const [deleteDetails,  setDeleteDetails]  = useState('');
  const [deleting,       setDeleting]       = useState(false);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const s = socket?.current || socket;
    if (!s || typeof s.on !== 'function') return;

    const handleRoadDeleted = (payload) => {
      const delId = payload?.id || payload?.roadId || payload?.segment_key;
      const delName = payload?.road_name;
      setSegments(prev => prev.filter(r =>
        r._id !== delId &&
        r.segment_key !== delId &&
        r.id !== delId &&
        r.road_name !== delName &&
        r._id !== payload?.roadId &&
        r.segment_key !== payload?.segment_key
      ));
    };

    s.on('road_deleted', handleRoadDeleted);
    s.on('road_segment_updated', load);

    return () => {
      s.off('road_deleted', handleRoadDeleted);
      s.off('road_segment_updated', load);
    };
  }, [socket]);

  const handleDeleteSegmentConfirm = async () => {
    if (!deleteModalSeg) return;
    const targetId = deleteModalSeg._id || deleteModalSeg.segment_key || deleteModalSeg.id;
    if (!targetId) return;

    setDeleting(true);
    try {
      await roadsAPI.delete(targetId, deleteReason, deleteDetails);
      setSegments(prev => prev.filter(s =>
        s._id !== targetId &&
        s.segment_key !== targetId &&
        s.id !== targetId &&
        s.road_name !== deleteModalSeg.road_name
      ));
      toast.success(`"${deleteModalSeg.road_name || targetId}" removed from critical segments`);
      setDeleteModalSeg(null);
      setDeleteDetails('');
      setDeleteReason('Road reconstructed');
    } catch (err) {
      toast.error(err.message || 'Failed to remove road segment');
    } finally {
      setDeleting(false);
    }
  };

  const selectedMidpoint = getSegMidpoint(selected);
  const mapCenter = selectedMidpoint || [25.1375, 93.0080];

  return (
    <div>
      <PageHeader
        title="Critical Road Segments"
        description="Bridge edges whose removal isolates settlements — sorted by impact"
      />

      {source === 'mock' && (
        <div style={{ fontSize: '0.78rem', color: 'var(--warning)', background: 'var(--warning-bg)', border: '1px solid var(--warning)', borderRadius: 8, padding: '8px 14px', marginBottom: 16 }}>
          ⚠ Showing demo data. Run <code>python scripts/critical_roads.py</code> in the risk-engine directory to compute real values.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16, alignItems: 'start' }}>

        {/* ── Left: Table ── */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
              <AlertOctagon size={15} style={{ marginRight: 6, verticalAlign: 'middle', color: 'var(--danger)' }} />
              {segments.length} critical segments
            </span>
            <button className="btn btn-secondary" onClick={load} disabled={loading} style={{ padding: '4px 10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 4 }}>
              <RefreshCw size={12} className={loading ? 'spin' : ''} /> Refresh
            </button>
          </div>

          {error && (
            <div style={{ padding: 16, color: 'var(--danger)', fontSize: '0.85rem' }}>⚠ {error}</div>
          )}

          <div style={{ maxHeight: 520, overflowY: 'auto' }}>
            {segments.map((seg) => {
              const segId = seg.id || seg.segment_key || seg._id;
              const isSelected = (selected?.id || selected?.segment_key || selected?._id) === segId;
              const isExpanded = expandedId === segId;
              const color = segColor(seg.settlement_count);
              return (
                <div
                  key={segId}
                  onClick={() => { setSelected(seg); setExpandedId(isExpanded ? null : segId); }}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--line)',
                    cursor: 'pointer',
                    background: isSelected ? 'var(--sky-tint)' : 'var(--white)',
                    borderLeft: `4px solid ${color}`,
                    transition: 'background 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--ink)' }}>{seg.road_name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--slate)', marginTop: 2 }}>
                        {seg.from_node} → {seg.to_node} · {seg.length_km} km · {seg.district}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                      <div style={{ fontWeight: 800, fontSize: '1.1rem', color }}>{seg.settlement_count}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--slate)' }}>villages cut off</div>
                    </div>
                  </div>

                  {isExpanded && seg.settlements_cutoff?.length > 0 && (
                    <div style={{ marginTop: 8, padding: '6px 10px', background: 'rgba(239,68,68,0.06)', borderRadius: 6 }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--danger)', marginBottom: 4 }}>Affected settlements:</div>
                      {seg.settlements_cutoff.map(name => (
                        <div key={name} style={{ fontSize: '0.75rem', color: 'var(--ink)', paddingLeft: 8, marginBottom: 2 }}>• {name}</div>
                      ))}
                    </div>
                  )}

                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--slate)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                      {isExpanded ? 'Hide villages' : 'Show villages'}
                    </div>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteModalSeg(seg);
                          setDeleteReason('Road reconstructed');
                          setDeleteDetails('');
                        }}
                        style={{
                          background: 'rgba(239,68,68,0.08)',
                          border: '1px solid rgba(239,68,68,0.3)',
                          borderRadius: 6,
                          padding: '2px 8px',
                          color: '#dc2626',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                        title="Remove critical road segment"
                      >
                        <Trash2 size={11} /> Remove
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right: Map ── */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', height: 560 }}>
          <MapErrorBoundary>
            <MapContainer center={mapCenter} zoom={9} style={{ height: '100%', width: '100%' }} zoomControl={true}>
              <TileLayer
                url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png"
                attribution="&copy; Stadia Maps &copy; OpenStreetMap contributors"
              />

              {selectedMidpoint && (
                <FlyTo lat={selectedMidpoint[0]} lon={selectedMidpoint[1]} />
              )}

              {/* All critical segments as thick colored polylines */}
              {segments.map(seg => {
                const positions = getSegPositions(seg);
                if (!positions || positions.length < 2) return null;
                const segId = seg.id || seg.segment_key || seg._id;
                const isCurrent = (selected?.id || selected?.segment_key || selected?._id) === segId;
                return (
                  <Polyline
                    key={`poly-${segId}`}
                    positions={positions}
                    pathOptions={{
                      color: segColor(seg.settlement_count),
                      weight: isCurrent ? 8 : 5,
                      opacity: isCurrent ? 1 : 0.65,
                    }}
                    eventHandlers={{ click: () => { setSelected(seg); setExpandedId(segId); } }}
                  >
                    <Popup>
                      <div style={{ minWidth: 180 }}>
                        <div style={{ fontWeight: 700, color: segColor(seg.settlement_count), marginBottom: 4 }}>
                          ⚠ {seg.road_name}
                        </div>
                        <div style={{ fontSize: '0.8rem', marginBottom: 2 }}>
                          <b>{seg.settlement_count}</b> settlement{seg.settlement_count !== 1 ? 's' : ''} cut off
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#666' }}>{seg.from_node} → {seg.to_node}</div>
                        {seg.settlements_cutoff?.length > 0 && (
                          <div style={{ marginTop: 6, fontSize: '0.72rem', borderTop: '1px solid #eee', paddingTop: 4 }}>
                            {seg.settlements_cutoff.join(', ')}
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Polyline>
                );
              })}

              {/* Midpoint markers for each critical segment */}
              {segments.map(seg => {
                const mid = getSegMidpoint(seg);
                if (!mid) return null;
                const segId = seg.id || seg.segment_key || seg._id;
                return (
                  <Marker key={`pin-${segId}`} position={mid} icon={flyIcon}>
                    <Popup>
                      <b>{seg.road_name}</b> — {seg.settlement_count} village{seg.settlement_count !== 1 ? 's' : ''} at risk
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </MapErrorBoundary>
        </div>
      </div>

      {/* Legend */}
      <div className="card" style={{ marginTop: 16, display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, fontSize: '0.82rem' }}>Severity legend:</span>
        {[
          { color: RISK_COLORS.high,   label: '2+ villages isolated (critical)' },
          { color: RISK_COLORS.medium, label: '1 village isolated (high)' },
          { color: RISK_COLORS.low,    label: 'Connectivity risk (moderate)' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem' }}>
            <span style={{ width: 24, height: 5, background: color, borderRadius: 3, display: 'inline-block' }} />
            {label}
          </div>
        ))}
        <div style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--slate)' }}>
          Click a segment in the table or on the map for details.
        </div>
      </div>

      {/* Delete / Remove Road Segment Confirmation Modal */}
      {deleteModalSeg && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px',
        }} onClick={() => !deleting && setDeleteModalSeg(null)}>
          <div style={{
            background: 'var(--white)',
            borderRadius: 14,
            width: '100%',
            maxWidth: 500,
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid var(--line)',
            animation: 'popoverFadeIn 0.2s ease',
          }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', borderBottom: '1px solid var(--line)',
              background: 'rgba(239, 68, 68, 0.06)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#dc2626',
                }}>
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: 'var(--ink)' }}>
                    Remove Critical Segment
                  </h3>
                  <div style={{ fontSize: '0.74rem', color: 'var(--slate)', marginTop: 2 }}>
                    {deleteModalSeg.road_name || deleteModalSeg.id} ({deleteModalSeg.district || 'NER'})
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteModalSeg(null)}
                disabled={deleting}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '20px' }}>
              <p style={{ margin: '0 0 16px', fontSize: '0.84rem', color: 'var(--slate)', lineHeight: 1.5 }}>
                Removing this road segment will mark it as <strong>REMOVED</strong>, taking it off the critical connectivity and vulnerability list.
              </p>

              <div style={{ marginBottom: 14 }}>
                <label style={{
                  display: 'block', fontSize: '0.75rem', fontWeight: 700,
                  color: 'var(--ink)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>
                  Reason for Removal *
                </label>
                <select
                  value={deleteReason}
                  onChange={e => setDeleteReason(e.target.value)}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 8,
                    border: '1px solid var(--line)', background: 'var(--white)',
                    fontSize: '0.86rem', color: 'var(--ink)', outline: 'none',
                  }}
                >
                  <option value="Road reconstructed">Road reconstructed / alternate bridge built</option>
                  <option value="Duplicate entry">Duplicate entry</option>
                  <option value="Incorrect data">Incorrect connectivity data</option>
                  <option value="Segment decommissioned">Segment decommissioned</option>
                  <option value="Other">Other reason (specify below)</option>
                </select>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{
                  display: 'block', fontSize: '0.75rem', fontWeight: 700,
                  color: 'var(--ink)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>
                  Additional Details {deleteReason === 'Other' ? '*' : '(Optional)'}
                </label>
                <textarea
                  rows={3}
                  value={deleteDetails}
                  onChange={e => setDeleteDetails(e.target.value)}
                  placeholder={deleteReason === 'Other' ? "Please explain why this road is being removed..." : "e.g. Bypass opened via NH-27, settlements now connected"}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 8,
                    border: '1px solid var(--line)', background: 'var(--white)',
                    fontSize: '0.84rem', color: 'var(--ink)', outline: 'none',
                    resize: 'vertical', fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>

            {/* Footer */}
            <div style={{
              display: 'flex', justifyContent: 'flex-end', gap: 10,
              padding: '14px 20px', borderTop: '1px solid var(--line)', background: 'var(--surface-elevated)',
            }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeleteModalSeg(null)}
                disabled={deleting}
                style={{ padding: '8px 16px', fontSize: '0.84rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSegmentConfirm}
                disabled={!deleteReason || (deleteReason === 'Other' && !deleteDetails.trim()) || deleting}
                style={{
                  padding: '8px 18px', fontSize: '0.84rem', fontWeight: 700,
                  borderRadius: 7, border: 'none',
                  cursor: !deleteReason || (deleteReason === 'Other' && !deleteDetails.trim()) || deleting ? 'not-allowed' : 'pointer',
                  background: !deleteReason || (deleteReason === 'Other' && !deleteDetails.trim()) || deleting ? '#f87171' : '#dc2626',
                  color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 6,
                }}
              >
                {deleting ? 'Removing…' : 'Confirm & Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
