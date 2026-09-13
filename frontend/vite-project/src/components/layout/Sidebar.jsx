/**
 * Sidebar.jsx — role-based navigation
 * Admin: sees Admin Approvals panel
 * Field Officer / Vehicle Operator: sees only their relevant sections
 */
import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Truck, Route, AlertTriangle, Package,
  Bell, Settings, Navigation, UserPlus, Car, KeyRound, MapPin, AlertOctagon, UsersRound, Siren,
  X, MessageSquare,
} from 'lucide-react';
import { auth } from '../../services/api';

const SECTION_LABEL = {
  fontSize:'0.58rem', fontWeight:800, color:'var(--slate-soft)',
  textTransform:'uppercase', letterSpacing:'0.1em',
  padding:'12px 20px 4px', userSelect:'none',
};

const NavItem = ({ path, label, icon: Icon, onClick, title }) => (
  <NavLink
    to={path}
    onClick={onClick}
    title={title || label}
    className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
  >
    <Icon size={19} style={{ flexShrink: 0 }} />
    <span>{label}</span>
  </NavLink>
);

export const Sidebar = ({ collapsed = false, isMobile = false, onClose }) => {
  const [user, setUser] = useState(() => auth.getUser());

  useEffect(() => {
    const handleAuthChange = (e) => {
      setUser(e.detail?.user ?? auth.getUser());
    };
    window.addEventListener('sih_auth_change', handleAuthChange);
    return () => window.removeEventListener('sih_auth_change', handleAuthChange);
  }, []);

  const role    = user?.role ?? '';
  const isAdmin = role === 'ADMIN';

  const mainItems = [
    { path:'/dashboard',      label:'Dashboard',       icon:LayoutDashboard },
    { path:'/districts',      label:'Districts',       icon:MapPin },
    ...(isAdmin ? [{ path:'/vehicles', label:'Vehicles', icon:Truck }] : []),
    { path:'/roads',          label:'Roads',           icon:Route },
    { path:'/incidents',      label:'Incidents',       icon:AlertTriangle },
    { path:'/deliveries',     label:'Deliveries',      icon:Package },
    { path:'/alerts',         label:'Alerts',          icon:Bell },
    { path:'/route-planner',   label:'Route Planner',   icon:Navigation },
    ...(isAdmin || role === 'FIELD_OFFICER' ? [{ path:'/chat', label:'Live Chat', icon:MessageSquare }] : []),
    ...(isAdmin || role === 'FIELD_OFFICER' ? [{ path:'/incident-report', label:'Report Incident', icon:Siren }] : []),
    { path:'/critical-roads',  label:'Critical Roads',  icon:AlertOctagon },
  ];

  // Admin sees: Personnel hub + Register Officer + Register Operator + Account
  // Other roles see: only Account
  const personnelItems = isAdmin ? [
    { path:'/personnel',         label:'Personnel',         icon:UsersRound },
    { path:'/register-officer',  label:'Register Officer',  icon:UserPlus },
    { path:'/register-operator', label:'Register Operator', icon:Car },
    { path:'/account',           label:'Account',           icon:KeyRound },
  ] : [
    { path:'/account', label:'Account', icon:KeyRound },
  ];

  const systemItems = [
    { path:'/settings', label:'Settings', icon:Settings },
  ];

  const handleNavClick = () => {
    if (isMobile && onClose) {
      onClose();
    }
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${isMobile ? 'mobile-drawer' : ''}`}>
      <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px', overflow: 'hidden' }}>
          <div style={{ width:4, height:32, borderRadius:2, background:'var(--sky)', flexShrink:0 }} />
          {!collapsed && (
            <div>
              <div style={{ fontSize:'1rem', fontWeight:800, color:'var(--sky-dark)', letterSpacing:'-0.01em' }}>SIH26002</div>
              <div style={{ fontSize:'0.65rem', color:'var(--slate)', fontWeight:500, letterSpacing:'0.06em', textTransform:'uppercase', marginTop:1 }}>
                Logistics Intelligence
              </div>
            </div>
          )}
        </div>
        {isMobile && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            style={{ background: 'none', border: 'none', color: 'var(--slate)', cursor: 'pointer', padding: 4, display: 'flex' }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="sidebar-nav">
        {mainItems.map(item => (
          <NavItem key={item.path} {...item} onClick={handleNavClick} title={collapsed ? item.label : undefined} />
        ))}

        {!collapsed && <div className="sidebar-section-label" style={SECTION_LABEL}>Personnel</div>}
        {personnelItems.map(item => (
          <NavItem key={item.path} {...item} onClick={handleNavClick} title={collapsed ? item.label : undefined} />
        ))}

        {!collapsed && <div className="sidebar-section-label" style={SECTION_LABEL}>System</div>}
        {systemItems.map(item => (
          <NavItem key={item.path} {...item} onClick={handleNavClick} title={collapsed ? item.label : undefined} />
        ))}
      </nav>
    </aside>
  );
};