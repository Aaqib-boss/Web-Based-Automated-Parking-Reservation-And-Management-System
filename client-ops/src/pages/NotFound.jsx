import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="page-wrapper container" style={styles.container}>
      <div style={styles.content} className="glass-card animate-fade-in">
        <HelpCircle size={60} color="var(--highlight)" style={{ marginBottom: '1.5rem' }} />
        <h1 style={styles.title}>404</h1>
        <h3 style={styles.subtitle}>Oops! Page Not Found</h3>
        <p style={styles.desc}>
          The link you followed may be broken or the page may have been removed. Let's get you back on track.
        </p>
        <Link to="/" className="btn btn-success" style={{ marginTop: '1.5rem' }}>
          Back to Home
        </Link>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 'calc(100vh - 170px)',
  },
  content: {
    maxWidth: '460px',
    width: '100%',
    padding: '3rem 2rem',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  title: {
    fontSize: '5rem',
    lineHeight: '1',
    fontFamily: 'var(--font-display)',
    color: 'var(--highlight)',
  },
  subtitle: {
    fontSize: '1.5rem',
    fontFamily: 'var(--font-display)',
    marginTop: '0.5rem',
  },
  desc: {
    color: 'var(--text-muted)',
    fontSize: '0.95rem',
    marginTop: '0.75rem',
    lineHeight: '1.5',
  },
};

export default NotFound;
