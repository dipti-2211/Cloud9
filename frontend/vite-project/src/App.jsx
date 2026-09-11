import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Vehicles } from './pages/Vehicles';
import { Roads } from './pages/Roads';
import { Incidents } from './pages/Incidents';
import { Deliveries } from './pages/Deliveries';
import { Alerts } from './pages/Alerts';
import { Settings } from './pages/Settings';
import { RoutePlanner } from './pages/RoutePlanner';
import { Login } from './pages/Login';
import { RegisterFieldOfficer } from './pages/RegisterFieldOfficer';
import { RegisterVehicleOperator } from './pages/RegisterVehicleOperator';
import { AccountDetails } from './pages/AccountDetails';
import { Districts } from './pages/Districts';
import { CriticalRoads } from './pages/CriticalRoads';
import { Personnel } from './pages/Personnel';
import { IncidentReport } from './pages/IncidentReport';
import { auth } from './services/api';
import { LanguageProvider } from './i18n/LanguageContext';

// Protected route — redirects to /login if no JWT token found
const ProtectedRoute = ({ children }) => {
  return auth.isLoggedIn() ? children : <Navigate to="/login" replace />;
};

// Public route — redirects to /dashboard if already logged in
const PublicRoute = ({ children }) => {
  return auth.isLoggedIn() ? <Navigate to="/dashboard" replace /> : children;
};

// Admin-only route — redirects to /dashboard for non-admins
const AdminRoute = ({ children }) => {
  if (!auth.isLoggedIn()) return <Navigate to="/login" replace />;
  const user = auth.getUser();
  return user?.role === 'ADMIN' ? children : <Navigate to="/dashboard" replace />;
};

// Role-based route — redirects to /dashboard if user's role not in allowedRoles
const RoleRoute = ({ children, allowedRoles }) => {
  if (!auth.isLoggedIn()) return <Navigate to="/login" replace />;
  const user = auth.getUser();
  return allowedRoles.includes(user?.role) ? children : <Navigate to="/dashboard" replace />;
};

function App() {
  return (
    <LanguageProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: 'var(--white)', color: 'var(--ink)', border: '1px solid var(--line)' },
          success: { iconTheme: { primary: 'var(--success)', secondary: '#fff' } },
          error:   { iconTheme: { primary: 'var(--danger)',  secondary: '#fff' } },
        }}
      />

      <BrowserRouter>
        <Routes>
          {/* Public — redirect to dashboard if already authenticated */}
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

          {/* Protected app shell with sidebar/nav */}
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"          element={<Dashboard />} />
            <Route path="vehicles"           element={<AdminRoute><Vehicles /></AdminRoute>} />
            <Route path="roads"              element={<Roads />} />
            <Route path="incidents"          element={<Incidents />} />
            <Route path="deliveries"         element={<Deliveries />} />
            <Route path="alerts"             element={<Alerts />} />
            <Route path="route-planner"      element={<RoutePlanner />} />
            <Route path="districts"          element={<Districts />} />
            <Route path="settings"           element={<Settings />} />
            {/* Personnel — admin creates accounts */}
            <Route path="register-officer"   element={<AdminRoute><RegisterFieldOfficer /></AdminRoute>} />
            <Route path="register-operator"  element={<AdminRoute><RegisterVehicleOperator /></AdminRoute>} />
            <Route path="account"            element={<AccountDetails />} />
            {/* Phase 4: Critical roads analysis */}
            <Route path="critical-roads"     element={<CriticalRoads />} />
            {/* Phase 6: Personnel management (admin only) */}
            <Route path="personnel"           element={<AdminRoute><Personnel /></AdminRoute>} />
            {/* Field officer incident reporting — admin + field officer only */}
            <Route path="incident-report"     element={<RoleRoute allowedRoles={['ADMIN','FIELD_OFFICER']}><IncidentReport /></RoleRoute>} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  );
}

export default App;