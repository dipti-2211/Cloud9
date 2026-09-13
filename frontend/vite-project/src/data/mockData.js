/**
 * mockData.js — extended with:
 *   roads[].reason       (why a road is blocked/high-risk)
 *   incidents[].cause    (root cause for Incidents chart)
 *   vehicles[].driver    (driver name for VehicleLiveModal)
 *   vehicles[].speed     (current speed km/h)
 *   Extended incident list for a richer cause breakdown
 */

export const dashboardKPIs = [
  { label: 'Active Deliveries', value: '142', icon: 'truck',          status: 'accent'   },
  { label: 'Vehicles Delayed', value: '18',  icon: 'clock',          status: 'warning'  },
  { label: 'Blocked Roads',    value: '4',   icon: 'alert-triangle', status: 'danger'   },
  { label: 'Active Incidents', value: '7',   icon: 'activity',       status: 'danger'   },
  { label: 'Critical Alerts',  value: '3',   icon: 'bell',           status: 'warning'  },
];

export const roads = [
  { id: 'NH-06', name: 'Guwahati – Shillong Hwy', status: 'OPEN',      riskScore: 12, lastUpdated: '10 min ago', incidents: 0, reason: null },
  { id: 'NH-10', name: 'Siliguri – Gangtok',       status: 'HIGH RISK', riskScore: 78, lastUpdated: '2 min ago',  incidents: 2, reason: 'Recurring landslide zone — steep escarpment, unstable regolith' },
  { id: 'SH-37', name: 'Dibrugarh Bypass',         status: 'CAUTION',   riskScore: 45, lastUpdated: '15 min ago', incidents: 1, reason: 'Flash-flood runoff eroding shoulder; surface water on carriageway' },
  { id: 'NH-2',  name: 'Kohima – Imphal',           status: 'BLOCKED',   riskScore: 95, lastUpdated: 'Just now',   incidents: 3, reason: 'Landslide debris across all lanes — NH-2, km 114. Cleared ETA unknown.' },
];

export const alerts = [
  { id: 'ALT-1', level: 'CRITICAL', message: 'Road blocked ahead of TRUCK-001. Rerouting required immediately.', time: '2m ago' },
  { id: 'ALT-2', level: 'WARNING',  message: 'Heavy rainfall detected near NH-10 corridor. Visibility dropping.', time: '15m ago' },
  { id: 'ALT-3', level: 'INFO',     message: 'Alternative route calculated for VAN-104 via SH-12.',              time: '1h ago' },
];

export const deliveries = [
  {
    id: 'DEL-1042', vehicle: 'TRUCK-001', cargo: 'Vaccines', priority: 'CRITICAL',
    source: 'Guwahati Hub', destination: 'Shillong Station', eta: '2h 15m', status: 'IN TRANSIT', progress: 65,
  },
  {
    id: 'DEL-1043', vehicle: 'VAN-104', cargo: 'Medical Kits', priority: 'CRITICAL',
    source: 'Silchar', destination: 'Imphal Hospital', eta: '4h 10m (+45m Delay)', status: 'DELAYED', progress: 30,
    delayMinutes: 45,
    delayLabel: '+45m Detour Delay',
    rerouteReason: '⚠ Detour Active: Rerouted via SH-12 due to landslide on NH-37',
    originalEta: '3h 25m',
  },
  {
    id: 'DEL-1044', vehicle: 'TRUCK-015', cargo: 'Construction Mat.', priority: 'NORMAL',
    source: 'Dibrugarh', destination: 'Aizawl Center', eta: '12h 00m', status: 'SCHEDULED', progress: 0,
  },
  {
    id: 'DEL-1041', vehicle: 'TRUCK-088', cargo: 'Food Supplies', priority: 'HIGH',
    source: 'Tezpur', destination: 'Itanagar', eta: 'Arrived', status: 'COMPLETED', progress: 100,
  },
];

export const vehicles = [
  {
    id: 'TRUCK-001', type: 'Refrigerated', cargo: 'Vaccines', priority: 'CRITICAL',
    status: 'IN TRANSIT', destination: 'Guwahati Hub', eta: '2h 15m',
    driver: 'Rajesh Kumar', speed: 42,
    position: [25.5788, 91.8933],
    route: [
      [25.5788, 91.8933],
      [25.7500, 91.8500],
      [25.9000, 91.8000],
      [26.1445, 91.7362],
    ],
  },
  {
    id: 'TRUCK-002', type: 'Heavy Cargo', cargo: 'Food Supplies', priority: 'HIGH',
    status: 'DELAYED', destination: 'Shillong Station', eta: '5h 40m (+1h 10m delay)',
    driver: 'Amit Singh', speed: 0,
    position: [25.5788, 91.8933],
    delayMinutes: 70,
    delayReason: 'Slow traffic crawl behind landslide clearance convoy',
  },
  {
    id: 'VAN-104', type: 'Light Utility', cargo: 'Medical Kits', priority: 'CRITICAL',
    status: 'DELAYED', destination: 'Imphal Hospital', eta: '4h 10m (+45m Detour Delay)',
    driver: 'Priya Devi', speed: 28,
    position: [24.8170, 93.9368],
    delayMinutes: 45,
    delayLabel: '+45m Detour',
    delayReason: 'Landslide Detour: Rerouted via SH-12 to bypass NH-37 hazard',
  },
  {
    id: 'TRUCK-015', type: 'Standard',     cargo: 'Construction Mat.', priority: 'NORMAL',
    status: 'IN TRANSIT',  destination: 'Aizawl Center', eta: '12h 00m',
    driver: 'David Lalthansanga', speed: 55,
    position: [23.7271, 92.7176],
  },
];

// Extended incidents list — tagged with `cause` for the breakdown chart
export const incidents = [
  { id: 'INC-992', type: 'Landslide',          cause: 'Landslide',             location: 'NH-2, Senapati District',  severity: 'CRITICAL', time: '10:45 AM', status: 'ACTIVE',      position: [25.2650, 94.0240] },
  { id: 'INC-993', type: 'Heavy Rainfall',      cause: 'Heavy Rainfall',        location: 'NH-10 Sector B',           severity: 'WARNING',  time: '09:30 AM', status: 'MONITORING',  position: [26.7271, 88.3953] },
  { id: 'INC-994', type: 'Bridge Damage',       cause: 'Bridge / Road Damage',  location: 'Teesta Bridge',            severity: 'CRITICAL', time: '06:15 AM', status: 'ACTIVE',      position: [27.0594, 88.4695] },
  { id: 'INC-995', type: 'Landslide',           cause: 'Landslide',             location: 'SH-37, Karbi Anglong',    severity: 'CRITICAL', time: '08:00 AM', status: 'ACTIVE',      position: [26.0, 93.5] },
  { id: 'INC-996', type: 'Mechanical Breakdown',cause: 'Mechanical Breakdown',  location: 'NH-6, Km 54',             severity: 'WARNING',  time: '07:10 AM', status: 'MONITORING',  position: [25.8, 91.9] },
  { id: 'INC-997', type: 'Landslide',           cause: 'Landslide',             location: 'NH-2, Kohima Approach',   severity: 'CRITICAL', time: '05:55 AM', status: 'ACTIVE',      position: [25.67, 94.11] },
  { id: 'INC-998', type: 'Overspeeding',        cause: 'Overspeeding',          location: 'NH-10, Sikkim Border',    severity: 'WARNING',  time: '04:30 AM', status: 'RESOLVED',    position: [27.3, 88.6] },
  { id: 'INC-999', type: 'Heavy Rainfall',      cause: 'Heavy Rainfall',        location: 'Brahmaputra Valley',      severity: 'WARNING',  time: '03:00 AM', status: 'MONITORING',  position: [26.2, 92.1] },
  { id: 'INC-1000',type: 'Mechanical Breakdown',cause: 'Mechanical Breakdown',  location: 'SH-37, Dibrugarh Exit',  severity: 'INFO',     time: '02:10 AM', status: 'RESOLVED',    position: [27.48, 94.9] },
  { id: 'INC-1001',type: 'Bridge Damage',       cause: 'Bridge / Road Damage',  location: 'Ijai River Bridge',       severity: 'WARNING',  time: '01:30 AM', status: 'MONITORING',  position: [24.9, 93.8] },
];

/**
 * DEMO_REROUTE_TRUCKS — Admin-only demo data showing 3 trucks being rerouted
 * when their planned path passes through critical / blocked roads.
 *
 * originalRoute → rendered RED  (goes through blocked / high-risk road)
 * reroutedRoute → rendered GREEN (safe detour bypassing the critical zone)
 */
export const DEMO_REROUTE_TRUCKS = [
  {
    id: 'TRUCK-D01',
    driver: 'Suresh Nath',
    cargo: 'Emergency Medical Supplies',
    status: 'REROUTED',
    priority: 'CRITICAL',
    speed: 38,
    // Current position — mid-journey on the rerouted path
    position: [25.4, 93.55],
    source: 'Guwahati Hub',
    destination: 'Imphal Hospital',
    eta: '5h 20m (+1h 05m Detour)',
    criticalRoad: 'NH-2 (Kohima–Imphal) — BLOCKED: Landslide debris across all lanes',
    rerouteReason: 'NH-2 fully blocked (km 114). Rerouted via NH-27 ➜ NH-36 safe corridor.',
    delayMinutes: 65,
    // Red route: original planned path straight through NH-2 blocked zone
    originalRoute: [
      [26.1445, 91.7362], // Guwahati
      [26.0, 92.5],
      [25.9, 93.0],
      [25.67, 94.11], // NH-2 Kohima Approach — blocked zone entry
      [25.50, 94.50],
      [24.817, 93.9368], // Imphal — destination (would have reached)
    ],
    // Green route: safe detour via NH-27 → NH-36 → NH-102
    reroutedRoute: [
      [26.1445, 91.7362], // Guwahati
      [26.07, 92.3],
      [26.04, 92.6],
      [25.9057, 93.727], // Dimapur
      [25.841, 93.435],  // Bokajan
      [25.4, 93.55],     // current position on detour
      [24.817, 93.9368], // Imphal — destination
    ],
  },
  {
    id: 'TRUCK-D02',
    driver: 'Lalthansanga David',
    cargo: 'Construction Materials',
    status: 'REROUTED',
    priority: 'HIGH',
    speed: 44,
    position: [25.05, 93.35],
    source: 'Dibrugarh',
    destination: 'Haflong',
    eta: '3h 45m (+40m Detour)',
    criticalRoad: 'SH-5 (Haflong–Dima Hasao) — HIGH RISK: Steep escarpment, active landslide zone',
    rerouteReason: 'SH-5 risk score 92%. Rerouted via NH-27 lowland approach.',
    delayMinutes: 40,
    // Red route: original path directly through SH-5 high-risk escarpment
    originalRoute: [
      [27.48, 94.9],   // Dibrugarh
      [26.8, 94.2],
      [26.2, 93.9],
      [25.75, 93.17],  // Lumding
      [25.145, 93.010], // SH-5 Haflong — dangerous escarpment
      [25.11, 92.9988], // Dima Hasao HQ (destination)
    ],
    // Green route: via NH-27 lowland (avoids the steep SH-5 escarpment)
    reroutedRoute: [
      [27.48, 94.9],   // Dibrugarh
      [26.8, 94.2],
      [26.2, 93.9],
      [25.9057, 93.727], // Dimapur junction
      [25.6, 93.5],
      [25.3, 93.2],
      [25.05, 93.35],  // current position (on safe detour)
      [25.11, 92.9988], // Dima Hasao HQ (destination)
    ],
  },
  {
    id: 'TRUCK-D03',
    driver: 'Priya Thapa',
    cargo: 'Food & Relief Supplies',
    status: 'REROUTED',
    priority: 'HIGH',
    speed: 50,
    position: [26.4, 88.7],
    source: 'Siliguri',
    destination: 'Gangtok',
    eta: '4h 10m (+55m Detour)',
    criticalRoad: 'NH-10 (Siliguri–Gangtok) — HIGH RISK: Heavy rainfall, visibility low, recurring landslide zone',
    rerouteReason: 'NH-10 risk score 78%. Rerouted via NH-31 Sevoke–Rangpo alternative.',
    delayMinutes: 55,
    // Red route: original path straight through NH-10 high-risk sector
    originalRoute: [
      [26.7271, 88.3953], // Siliguri
      [27.0, 88.45],
      [27.2, 88.48],
      [27.32, 88.52],     // NH-10 high-risk zone
      [27.35, 88.57],
      [27.3314, 88.6138], // Gangtok (destination)
    ],
    // Green route: via NH-31 (Sevoke Road → Rangpo → Gangtok)
    reroutedRoute: [
      [26.7271, 88.3953], // Siliguri
      [26.6, 88.5],
      [26.4, 88.7],       // current position on detour
      [26.9, 88.75],
      [27.15, 88.6],
      [27.3314, 88.6138], // Gangtok (destination)
    ],
  },
];