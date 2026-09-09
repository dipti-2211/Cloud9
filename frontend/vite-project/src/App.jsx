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

function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--white)',
            color: 'var(--ink)',
            border: '1px solid var(--line)',
          },
          success: { iconTheme: { primary: 'var(--success)', secondary: '#fff' } },
          error:   { iconTheme: { primary: 'var(--danger)',  secondary: '#fff' } },
        }}
      />

      <BrowserRouter>
        <Routes>
          {/* Login — full-screen, no sidebar */}
          <Route path="/login" element={<Login />} />

          {/* App shell with sidebar/nav */}
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"           element={<Dashboard />} />
            <Route path="vehicles"            element={<Vehicles />} />
            <Route path="roads"               element={<Roads />} />
            <Route path="incidents"           element={<Incidents />} />
            <Route path="deliveries"          element={<Deliveries />} />
            <Route path="alerts"              element={<Alerts />} />
            <Route path="route-planner"       element={<RoutePlanner />} />
            <Route path="settings"            element={<Settings />} />
            {/* Personnel */}
            <Route path="register-officer"    element={<RegisterFieldOfficer />} />
            <Route path="register-operator"   element={<RegisterVehicleOperator />} />
            <Route path="account"             element={<AccountDetails />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;