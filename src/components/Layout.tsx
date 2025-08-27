
import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { SecondarySidebarProvider, useSecondarySidebar } from '@/context/SecondarySidebarContext';
import { useAuth } from '../context/AuthContext'; // Import useAuth

const mainSidebarWidth = 250;

const navLinkStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '10px',
  textDecoration: 'none',
  color: '#333',
  fontWeight: 'bold',
  padding: '10px',
  borderRadius: '5px',
  transition: 'background-color 0.2s',
};

const LayoutContent: React.FC = () => {
  const { secondarySidebarContent, secondarySidebarWidth } = useSecondarySidebar();
  const location = useLocation();
  const { isAuthenticated, logout } = useAuth(); // Use auth context

  const currentMainContentMarginLeft = mainSidebarWidth + secondarySidebarWidth;

  return (
    <>
      {/* Main Sidebar */}
      <div style={{
        width: `${mainSidebarWidth}px`,
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        backgroundColor: '#f0f0f0',
        padding: '20px',
        borderRight: '1px solid #ddd',
      }}>
        <h2 style={{ color: '#333', marginBottom: '20px' }}>Projects</h2>
        <nav>
          <Link to="/ai-shorts-generator" style={navLinkStyle} 
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ddd'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >AI Shorts Generator</Link>
          <Link to="/youtube-shorts-content-factory" style={navLinkStyle} 
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ddd'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >YouTube Shorts Content Factory</Link>
          <Link to="/attention-model" style={navLinkStyle} 
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ddd'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >Attention Model</Link>

          <h2 style={{ color: '#333', marginBottom: '20px', marginTop: '30px' }}>GCP Services</h2>
          <Link to="/drive" style={navLinkStyle} 
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ddd'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >Google Drive</Link>
          <Link to="/sheets" style={navLinkStyle} 
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ddd'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >Google Sheets</Link>
          <Link to="/docs" style={navLinkStyle} 
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ddd'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >Google Docs</Link>
          <Link to="/youtube" style={navLinkStyle} 
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ddd'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >YouTube Data</Link>

          <h2 style={{ color: '#333', marginBottom: '20px', marginTop: '30px' }}>Authentication</h2>
          {isAuthenticated ? (
            <button onClick={logout} style={navLinkStyle} 
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ddd'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >Logout</button>
          ) : (
            <Link to="/login" style={navLinkStyle} 
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ddd'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >Login</Link>
          )}
        </nav>
      </div>

      {/* Secondary Sidebar (DRF specific) */}
      {secondarySidebarContent && (
        <div style={{
          width: `${secondarySidebarWidth}px`,
          height: '100vh',
          position: 'fixed',
          top: 0,
          left: `${mainSidebarWidth}px`,
          backgroundColor: '#f8f8f8',
          padding: '20px',
          borderRight: '1px solid #e0e0e0',
          zIndex: 10,
        }}>
          {secondarySidebarContent}
        </div>
      )}

      {/* Main Content Area */}
      <main style={{
        marginLeft: `${currentMainContentMarginLeft}px`,
        padding: '20px',
        width: `calc(100% - ${currentMainContentMarginLeft}px)`,
        backgroundColor: '#ffffff',
        minHeight: '100vh',
        color: '#333',
      }}>
        <Outlet />
      </main>
    </>
  );
};

const Layout: React.FC = () => {
  return (
    <SecondarySidebarProvider>
      <LayoutContent />
    </SecondarySidebarProvider>
  );
};

export default Layout;
