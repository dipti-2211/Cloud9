import { Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { IncidentAlertModal } from '../common/IncidentAlertModal';

export const Layout = () => {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) return true;
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      if (!isMobile) localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

  const closeSidebarMobile = () => {
    if (isMobile) setSidebarCollapsed(true);
  };

  return (
    <div className="app-container">
      {isMobile && !sidebarCollapsed && (
        <div className="sidebar-backdrop" onClick={closeSidebarMobile} />
      )}
      <Sidebar
        collapsed={sidebarCollapsed}
        isMobile={isMobile}
        onClose={closeSidebarMobile}
      />
      <main className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Navbar onToggleSidebar={toggleSidebar} sidebarCollapsed={sidebarCollapsed} />
        <div className="page-content">
          <Outlet />
        </div>
      </main>
      <IncidentAlertModal />
    </div>
  );
};