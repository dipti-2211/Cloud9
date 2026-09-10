/**
 * CriticalRoads.jsx — /critical-roads
 *
 * Shows bridge edges in the NER road network whose removal disconnects
 * settlements from the main network. Sorted by settlement count descending.
 *
 * Data from GET /api/critical-roads (precomputed by risk-engine/scripts/critical_roads.py)
 */
import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AlertOctagon, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { getCriticalRoads } from '../services/api';
import { PageHeader } from '../components/common/PageHeader';

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

/** Flies map to selected segment */
const FlyTo = ({ lat, lon }) => {
  const map = useMap();
  useEffect(() => {
    if (lat && lon) map.flyTo([lat, lon], 12, { animate: true, duration: 0.8 });
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
      const sorted = [...(data.criticalRoads ?? [])].sort((a, b) => b.settlement_count - a.settlement_count);
      setSegments(sorted);
      setSource(data.source ?? '');
      if (sorted.length) setSelected(sorted[0]);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const mapCenter = selected ? [selected.mid_lat, selected.mid_lon] : [25.1, 92.9];

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
              const isSelected = selected?.id === seg.id;
              const isExpanded = expandedId === seg.id;
              const color = segColor(seg.settlement_count);
              return (
                <div
                  key={seg.id}
                  onClick={() => { setSelected(seg); setExpandedId(isExpanded ? null : seg.id); }}
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

                  <div style={{ marginTop: 4, fontSize: '0.7rem', color: 'var(--slate)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                    {isExpanded ? 'Hide villages' : 'Show villages'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right: Map ── */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', height: 560 }}>
          <MapContainer center={mapCenter} zoom={9} style={{ height: '100%', width: '100%' }} zoomControl={true}>
            <TileLayer
              url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png"
              attribution="&copy; Stadia Maps &copy; OpenStreetMap contributors"
            />

            {selected && <FlyTo lat={selected.mid_lat} lon={selected.mid_lon} />}

            {/* All critical segments as thick colored polylines */}
            {segments.map(seg => (
              <Polyline
                key={seg.id}
                positions={[[seg.from_lat, seg.from_lon], [seg.to_lat, seg.to_lon]]}
                pathOptions={{
                  color: segColor(seg.settlement_count),
                  weight: seg.id === selected?.id ? 8 : 5,
                  opacity: seg.id === selected?.id ? 1 : 0.65,
                }}
                eventHandlers={{ click: () => { setSelected(seg); setExpandedId(seg.id); } }}
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
            ))}

            {/* Midpoint markers for each critical segment */}
            {segments.map(seg => (
              <Marker key={`pin-${seg.id}`} position={[seg.mid_lat, seg.mid_lon]} icon={flyIcon}>
                <Popup>
                  <b>{seg.road_name}</b> — {seg.settlement_count} village{seg.settlement_count !== 1 ? 's' : ''} at risk
                </Popup>
              </Marker>
            ))}
          </MapContainer>
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
    </div>
  );
};
