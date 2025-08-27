import React from 'react';
import { Link } from 'react-router-dom';

interface SidebarProps {
  isAuthenticated: boolean;
  logout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isAuthenticated, logout }) => {
  return (
    <div style={{
      width: '200px',
      backgroundColor: '#f0f0f0',
      padding: '20px',
      minHeight: '100vh',
      boxShadow: '2px 0 5px rgba(0,0,0,0.1)'
    }}>
      <h2>Navigation</h2>
      <nav style={{ display: 'flex', flexDirection: 'column' }}>
        <Link to="/">Home</Link>
        {!isAuthenticated ? (
          <Link to="/login">Login</Link>
        ) : (
          <button onClick={logout} style={{ marginTop: '10px' }}>Logout</button>
        )}
        {isAuthenticated && (
          <>
            <h3>API Integrations</h3>
            <Link to="/drive">Google Drive</Link>
            <Link to="/sheets">Google Sheets</Link>
            <Link to="/docs">Google Docs</Link>
            <Link to="/youtube">YouTube</Link>
          </>
        )}
      </nav>
    </div>
  );
};

export default Sidebar;
