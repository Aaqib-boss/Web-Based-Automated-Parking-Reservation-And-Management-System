import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading, logout } = useContext(AuthContext);

  if (loading) {
    // Show a premium glassmorphic loading screen
    return (
      <div style={styles.loaderContainer}>
        <div style={styles.loader}></div>
        <p style={styles.loaderText}>Authenticating secure connection...</p>
      </div>
    );
  }

  // If user is not logged in, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Restrict access strictly to the customer 'user' role
  if (user.role !== 'user') {
    logout();
    return <Navigate to="/login" replace />;
  }

  return children;
};

const styles = {
  loaderContainer: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--background)',
  },
  loader: {
    border: '4px solid rgba(255, 255, 255, 0.05)',
    borderTop: '4px solid var(--success)',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    animation: 'spin 1s linear infinite',
  },
  loaderText: {
    marginTop: '1rem',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-display)',
    fontSize: '0.95rem',
  },
};

// Add keyframes dynamically for loader spinner
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

export default ProtectedRoute;
