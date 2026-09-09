/**
 * Districts.jsx — District-wise Accessibility Dashboard
 *
 * Groups road and alert data by NER district.
 * For each district, shows: road status counts (OPEN/CAUTION/HIGH_RISK/BLOCKED),
 * active incident count, and an overall computed status (worst-case wins).
 *
 * Data sources:
 *  - /api/roads  → live road records (with optional district field)
 *  - /api/alerts → live alert records
 * Falls back to mock data if the DB is empty.
 */
import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { Badge } from '../components/common/Badge';
import { roadsAPI, alertsAPI } from '../services/api';
import { roads as mockRoads } from '../data/mockData';
import { useLang } from '../i18n/LanguageContext';
import { MapPin, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

// ── NER district list (static fallback for road-name → district mapping) ──
// Real road records should carry a `district` field; this is used when they don't.
const NER_DISTRICTS = [
  'Dima Hasao', 'Kamrup', 'Karbi Anglong', 'East Khasi Hills',
  'West Imphal', 'East Imphal', 'Dimapur', 'Kohima',
  'Lunglei', 'Aizawl', 'Itanagar', 'Tawang',
];

// Keyword-based district inference from road name / location string
const inferDistrict = (road) => {
  if (road.district) return road.district;
  const haystack = `${road.name || ''} ${road.ref || ''} ${road.id || ''}`.toLowerCase();
  if (haystack.includes('dima') || haystack.includes('hasao') || haystack.includes('haflong')) return 'Dima Hasao';
  if (haystack.includes('kamrup') || haystack.includes('guwahati'))                             return 'Kamrup';
  if (haystack.includes('karbi') || haystack.includes('dibrugarh'))                             return 'Karbi Anglong';
  if (haystack.includes('khasi') || haystack.includes('shillong'))                              return 'East Khasi Hills';
  if (haystack.includes('imphal') || haystack.includes('manipur'))                              return 'West Imphal';
  if (haystack.includes('kohima') || haystack.includes('nagaland'))                             return 'Kohima';
  if (haystack.includes('aizawl') || haystack.includes('mizoram') || haystack.includes('lunglei')) return 'Aizawl';
  if (haystack.includes('itanagar') || haystack.includes('arunachal'))                          return 'Itanagar';
  if (haystack.includes('siliguri') || haystack.includes('gangtok') || haystack.includes('sikkim')) return 'East Imphal';
  // Distribute unmatched roads across the first 4 districts by hash
  const hash = [...(road.id || road.name || 'x')].reduce((a, c) => a + c.charCodeAt(0), 0);
  return NER_DISTRICTS[hash % 4];
};

// Severity ranking for overall district status (worst wins)
const STATUS_RANK = { 'BLOCKED': 4, 'HIGH RISK': 3, 'HIGH_RISK': 3, 'CAUTION': 2, 'OPEN': 1 };
const STATUS_COLOUR = {
  'BLOCKED':   { bg: '#fee2e2', border: '#fca5a5', text: '#b91c1c', dot: '#ef4444' },
  'HIGH RISK': { bg: '#ffedd5', border: '#fdba74', text: '#c2410c', dot: '#f97316' },
  'HIGH_RISK': { bg: '#ffedd5', border: '#fdba74', text: '#c2410c', dot: '#f97316' },
  'CAUTION':   { bg: '#fef9c3', border: '#fde047', text: '#a16207', dot: '#eab308' },
  'OPEN':      { bg: '#dcfce7', border: '#86efac', text: '#15803d', dot: '#22c55e' },
};
const FALLBACK_COLOUR = { bg: '#f1f5f9', border: '#cbd5e1', text: '#475569', dot: '#94a3b8' };

const statusColour = (s) => STATUS_COLOUR[s] ?? FALLBACK_COLOUR;

export const Districts = () => {
  const { t } = useLang();
  const [roads,    setRoads]    = useState([]);
  const [alerts,   setAlerts]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [lastSync, setLastSync] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [roadsData, alertsData] = await Promise.all([
        roadsAPI.getAll().catch(() => mockRoads),
        alertsAPI.getAll().catch(() => []),
      ]);
      setRoads(Array.isArray(roadsData) ? roadsData : mockRoads);
      setAlerts(Array.isArray(alertsData) ? alertsData : []);
      setLastSync(new Date());
    } catch {
      setRoads(mockRoads);
      setAlerts([]);
      setError('Could not reach the backend — showing cached data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Build per-district summaries
  const districtSummaries = useMemo(() => {
    const map = {};

    roads.forEach(road => {
      const district = inferDistrict(road);
      if (!map[district]) map[district] = { district, open: 0, caution: 0, highRisk: 0, blocked: 0, incidents: 0, worstStatus: 'OPEN' };
      const d = map[district];
      const st = (road.status || 'OPEN').toUpperCase().replace(/ /g, '_');
      if      (st === 'BLOCKED')   d.blocked++;
      else if (st === 'HIGH_RISK' || road.status === 'HIGH RISK') d.highRisk++;
      else if (st === 'RESTRICTED' || st === 'CAUTION') d.caution++;
      else                         d.open++;

      const displayStatus = road.status || 'OPEN';
      if ((STATUS_RANK[displayStatus] ?? 0) > (STATUS_RANK[d.worstStatus] ?? 0)) {
        d.worstStatus = displayStatus;
      }
    });

    // Count active alerts per district (alert.district or infer from message)
    alerts.forEach(alert => {
      const alertText = `${alert.message || ''} ${alert.district || ''}`.toLowerCase();
      const matched = Object.keys(map).find(d => alertText.includes(d.toLowerCase()));
      if (matched) map[matched].incidents++;
    });

    // Fill in NER_DISTRICTS that had no road data (show them as unknown/green)
    NER_DISTRICTS.forEach(d => {
      if (!map[d]) map[d] = { district: d, open: 0, caution: 0, highRisk: 0, blocked: 0, incidents: 0, worstStatus: 'OPEN' };
    });

    return Object.values(map).sort((a, b) => (STATUS_RANK[b.worstStatus] ?? 0) - (STATUS_RANK[a.worstStatus] ?? 0));
  }, [roads, alerts]);

  const totalBlocked  = districtSummaries.reduce((s, d) => s + d.blocked, 0);
  const totalHighRisk = districtSummaries.reduce((s, d) => s + d.highRisk, 0);

  return (
    <div>
      <PageHeader
        title="District Accessibility"
        description="Real-time road accessibility and risk summary grouped by NER district."
        actionButton={
          <button className="btn btn-primary" onClick={load} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
            Refresh
          </button>
        }
      />

      {error && (
        <div style={{ padding: '10px 14px', marginBottom: 20, borderRadius: 8, fontSize: '0.82rem',
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', color: '#b45309' }}>
          ⚠ {error}
        </div>
      )}

      {/* Summary strip */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Districts Monitored', value: districtSummaries.length, color: 'var(--sky-dark)' },
          { label: 'Roads Blocked',       value: totalBlocked,  color: '#ef4444' },
          { label: 'High Risk Roads',     value: totalHighRisk, color: '#f97316' },
          { label: 'Active Alerts',       value: alerts.length, color: '#eab308' },
        ].map(s => (
          <div key={s.label} className="card" style={{ flex: '1 1 140px', textAlign: 'center', padding: '16px' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* District cards grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
          <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
          <div>Loading district data…</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {districtSummaries.map(d => {
            const c = statusColour(d.worstStatus);
            const totalRoads = d.open + d.caution + d.highRisk + d.blocked;
            return (
              <div key={d.district} className="card" style={{
                borderTop: `3px solid ${c.dot}`, transition: 'box-shadow .15s',
              }}>
                {/* District header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: c.bg, border: `1px solid ${c.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <MapPin size={15} color={c.dot} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--ink)' }}>{d.district}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--slate)', marginTop: 1 }}>
                        {totalRoads} road{totalRoads !== 1 ? 's' : ''} tracked
                      </div>
                    </div>
                  </div>
                  {/* Overall status badge */}
                  <span style={{
                    padding: '3px 9px', borderRadius: 10, fontSize: '0.65rem', fontWeight: 800,
                    background: c.bg, color: c.text, border: `1px solid ${c.border}`,
                    textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap',
                  }}>
                    {t(d.worstStatus) || d.worstStatus}
                  </span>
                </div>

                {/* Road status breakdown */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', marginBottom: 12 }}>
                  {[
                    { label: 'Open',      count: d.open,     colour: '#22c55e' },
                    { label: 'Caution',   count: d.caution,  colour: '#eab308' },
                    { label: 'High Risk', count: d.highRisk, colour: '#f97316' },
                    { label: 'Blocked',   count: d.blocked,  colour: '#ef4444' },
                  ].map(row => (
                    <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: row.colour, flexShrink: 0 }} />
                      <span style={{ color: 'var(--slate)' }}>{row.label}</span>
                      <span style={{ fontWeight: 700, marginLeft: 'auto', color: row.count > 0 && row.colour !== '#22c55e' ? row.colour : 'var(--ink)' }}>
                        {row.count}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Road status mini progress bar */}
                {totalRoads > 0 && (
                  <div style={{ height: 5, borderRadius: 3, overflow: 'hidden', display: 'flex', marginBottom: 12 }}>
                    {d.open    > 0 && <div style={{ flex: d.open,    background: '#22c55e' }} />}
                    {d.caution > 0 && <div style={{ flex: d.caution, background: '#eab308' }} />}
                    {d.highRisk> 0 && <div style={{ flex: d.highRisk,background: '#f97316' }} />}
                    {d.blocked > 0 && <div style={{ flex: d.blocked, background: '#ef4444' }} />}
                  </div>
                )}

                {/* Incident count */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem',
                  padding: '6px 10px', background: d.incidents > 0 ? 'rgba(239,68,68,0.06)' : 'var(--sky-tint)',
                  borderRadius: 6, border: d.incidents > 0 ? '1px solid rgba(239,68,68,0.2)' : '1px solid var(--sky-tint-2)',
                }}>
                  {d.incidents > 0 ? <AlertTriangle size={13} color="#ef4444" /> : <CheckCircle size={13} color="#22c55e" />}
                  <span style={{ color: 'var(--slate)' }}>
                    {d.incidents > 0 ? `${d.incidents} active alert${d.incidents !== 1 ? 's' : ''}` : 'No active alerts'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {lastSync && (
        <div style={{ marginTop: 16, fontSize: '0.72rem', color: 'var(--slate-soft)', textAlign: 'right' }}>
          Last synced: {lastSync.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};
