/**
 * Sidebar.jsx — role-based navigation
 * Admin: sees Admin Approvals panel
 * Field Officer / Vehicle Operator: sees only their relevant sections
 */
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Truck, Route, AlertTriangle, Package,
  Bell, Settings, Navigation, UserPlus, Car, KeyRound, ShieldCheck,
} from 'lucide-react';
import { auth } from '../../services/api';

const SECTION_LABEL = {
  fontSize:'0.58rem', fontWeight:800, color:'var(--slate-soft)',
  textTransform:'uppercase', letterSpacing:'0.1em',
  padding:'12px 20px 4px', userSelect:'none',
};

const NavItem = ({ path, label, icon: Icon }) => (
  <NavLink to={path} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
    <Icon size={19} />
    <span>{label}</span>
  </NavLink>
);

export const Sidebar = () => {
  const user    = auth.getUser();
  const role    = user?.role ?? '';
  const isAdmin = role === 'ADMIN';

  const mainItems = [
    { path:'/dashboard',     label:'Dashboard',     icon:LayoutDashboard },
    { path:'/vehicles',      label:'Vehicles',      icon:Truck },
    { path:'/roads',         label:'Roads',         icon:Route },
    { path:'/incidents',     label:'Incidents',     icon:AlertTriangle },
    { path:'/deliveries',    label:'Deliveries',    icon:Package },
    { path:'/alerts',        label:'Alerts',        icon:Bell },
    { path:'/route-planner', label:'Route Planner', icon:Navigation },
  ];

  // Admin sees: Register Officer + Register Operator + Admin Approvals
  // Others see: only Register (their own type) + Account
  const personnelItems = isAdmin ? [
    { path:'/register-officer',  label:'Register Officer',  icon:UserPlus },
    { path:'/register-operator', label:'Register Operator', icon:Car },
    { path:'/account',           label:'Account',           icon:KeyRound },
  ] : role === 'FIELD_OFFICER' ? [
    { path:'/register-officer',  label:'Register Officer',  icon:UserPlus },
    { path:'/account',           label:'Account',           icon:KeyRound },
  ] : [
    { path:'/register-operator', label:'Register Operator', icon:Car },
    { path:'/account',           label:'Account',           icon:KeyRound },
  ];

  const systemItems = [
    { path:'/settings', label:'Settings', icon:Settings },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:4, height:32, borderRadius:2, background:'var(--sky)', flexShrink:0 }} />
          <div>
            <div style={{ fontSize:'1rem', fontWeight:800, color:'var(--sky-dark)', letterSpacing:'-0.01em' }}>SIH26002</div>
            <div style={{ fontSize:'0.65rem', color:'var(--slate)', fontWeight:500, letterSpacing:'0.06em', textTransform:'uppercase', marginTop:1 }}>
              Logistics Intelligence
            </div>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {mainItems.map(item => <NavItem key={item.path} {...item} />)}

        <div style={SECTION_LABEL}>Personnel</div>
        {personnelItems.map(item => <NavItem key={item.path} {...item} />)}

        {/* Admin-only section */}
        {isAdmin && (
          <>
            <div style={SECTION_LABEL}>Admin</div>
            <NavItem path="/admin/approvals" label="Approvals" icon={ShieldCheck} />
          </>
        )}

        <div style={SECTION_LABEL}>System</div>
        {systemItems.map(item => <NavItem key={item.path} {...item} />)}
      </nav>
    </aside>
  );
};