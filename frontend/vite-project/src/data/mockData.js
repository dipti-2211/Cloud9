/**
 * mockData.js — extended with:
 *   roads[].reason       (why a road is blocked/high-risk)
 *   incidents[].cause    (root cause for Incidents chart)
 *   vehicles[].driver    (driver name for VehicleLiveModal)
 *   vehicles[].speed     (current speed km/h)
 *   Extended incident list for a richer cause breakdown
 */

export const dashboardKPIs = [
  { label: 'Active Vehicles',  value: '142', icon: 'truck',          status: 'accent'   },
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
  { id: 'DEL-1042', vehicle: 'TRUCK-001', cargo: 'Vaccines',            priority: 'CRITICAL', source: 'Guwahati Hub', destination: 'Shillong Station', eta: '2h 15m', status: 'IN TRANSIT', progress: 65  },
  { id: 'DEL-1043', vehicle: 'VAN-104',   cargo: 'Medical Kits',        priority: 'CRITICAL', source: 'Silchar',       destination: 'Imphal Hospital',   eta: '4h 10m', status: 'DELAYED',    progress: 30  },
  { id: 'DEL-1044', vehicle: 'TRUCK-015', cargo: 'Construction Mat.',   priority: 'NORMAL',   source: 'Dibrugarh',    destination: 'Aizawl Center',     eta: '12h 00m',status: 'SCHEDULED',  progress: 0   },
  { id: 'DEL-1041', vehicle: 'TRUCK-088', cargo: 'Food Supplies',       priority: 'HIGH',     source: 'Tezpur',       destination: 'Itanagar',          eta: 'Arrived', status: 'COMPLETED',  progress: 100 },
];

export const vehicles = [
  {
    id: 'TRUCK-001', type: 'Refrigerated', cargo: 'Vaccines',          priority: 'CRITICAL',
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
    id: 'TRUCK-002', type: 'Heavy Cargo',  cargo: 'Food Supplies',     priority: 'HIGH',
    status: 'DELAYED',     destination: 'Shillong Station', eta: '5h 40m',
    driver: 'Amit Singh',  speed: 0,
    position: [25.5788, 91.8933],
  },
  {
    id: 'VAN-104',   type: 'Light Utility',cargo: 'Medical Kits',      priority: 'CRITICAL',
    status: 'RE-ROUTING',  destination: 'Imphal Hospital', eta: '4h 10m',
    driver: 'Priya Devi',  speed: 28,
    position: [24.8170, 93.9368],
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