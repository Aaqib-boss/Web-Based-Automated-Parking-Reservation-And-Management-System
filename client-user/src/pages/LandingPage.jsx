import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { SocketContext } from '../context/SocketContext';
import { Shield, Zap, Compass, RefreshCw } from 'lucide-react';
import heroVideo from '../assets/parking-hero.mp4';

const LandingPage = () => {
  const socket = useContext(SocketContext);
  const [totalSpots, setTotalSpots] = useState(60);
  const [availableSpots, setAvailableSpots] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch initial spot stats
  const fetchSpotStats = async () => {
    try {
      const res = await axios.get('/api/spots');
      if (res.data.success) {
        const spots = res.data.data || [];
        setTotalSpots(spots.length);
        const available = spots.filter(s => s && s.status === 'available').length;
        setAvailableSpots(available);
      }
    } catch (err) {
      console.error('Error fetching parking spots:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpotStats();

    // Listen to real-time spot status changes
    if (socket) {
      socket.on('spotStatusChanged', (updatedSpot) => {
        // Re-fetch stats to get fresh counts
        fetchSpotStats();
      });
    }

    return () => {
      if (socket) {
        socket.off('spotStatusChanged');
      }
    };
  }, [socket]);

  return (
    <div style={styles.page}>
      {/* Hero Section */}
      <section style={styles.heroSection}>
        {/* Video Background */}
        <video 
          autoPlay 
          muted 
          loop 
          playsInline 
          style={styles.videoBg}
          onError={(e) => {
            console.log('Video load failed, using fallback background');
            e.target.style.display = 'none';
          }}
        >
          <source src={heroVideo} type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        {/* Dark Overlay */}
        <div style={styles.overlay}></div>

        {/* Hero Content */}
        <div className="container hero-grid-container" style={styles.heroContent}>
          <div style={styles.titleContainer} className="animate-fade-in">
            <h1 style={styles.heroTitle}>Smart Parking.</h1>
            <h1 style={{ ...styles.heroTitle, color: 'var(--success)' }}>Simplified.</h1>
            <p style={styles.heroSubText}>
              Find, reserve, and pay for parking spots instantly. IoT-enabled live status updates ensure you never waste time searching for a slot again.
            </p>
          </div>

          {/* Availability Display */}
          <div style={styles.statsCard} className="glass-card animate-fade-in">
            <h3 style={styles.statsHeader}>Live Slot Availability</h3>
            {loading ? (
              <div style={styles.loadingStats}>
                <RefreshCw className="spin" size={20} />
                <span>Syncing live availability...</span>
              </div>
            ) : (
              <div style={styles.counterRow}>
                <div style={styles.counterBlock}>
                  <span style={styles.counterNumber}>{availableSpots}</span>
                  <span style={styles.counterLabel}>Available</span>
                </div>
                <div style={styles.counterDivider}>/</div>
                <div style={styles.counterBlock}>
                  <span style={{ ...styles.counterNumber, color: 'var(--text)' }}>{totalSpots}</span>
                  <span style={styles.counterLabel}>Total Spots</span>
                </div>
              </div>
            )}
            <Link to="/map" className="btn btn-success" style={{ width: '100%', marginTop: '1.5rem' }}>
              Book Parking Space Now
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section style={styles.featuresSection}>
        <div className="container">
          <h2 style={styles.sectionTitle}>Why Choose ParkSmart?</h2>
          <div style={styles.featuresGrid}>
            <div style={styles.featureCard} className="glass-card">
              <Zap size={36} color="var(--success)" style={{ marginBottom: '1rem' }} />
              <h3 style={styles.featureHeading}>Real-Time Tracking</h3>
              <p style={styles.featureText}>
                Our smart IoT sensors broadcast slot statuses immediately. See live availability from anywhere.
              </p>
            </div>
            <div style={styles.featureCard} className="glass-card">
              <Shield size={36} color="var(--highlight)" style={{ marginBottom: '1rem' }} />
              <h3 style={styles.featureHeading}>Guaranteed Security</h3>
              <p style={styles.featureText}>
                24/7 CCTV surveillance, well-lit spaces, and automated license-plate verification scanners.
              </p>
            </div>
            <div style={styles.featureCard} className="glass-card">
              <Compass size={36} color="#FFD60A" style={{ marginBottom: '1rem' }} />
              <h3 style={styles.featureHeading}>EV & Handicap Friendly</h3>
              <p style={styles.featureText}>
                Dedicated charging terminals for electric vehicles and accessible slots close to exit gates.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

const styles = {
  page: {
    background: 'var(--background)',
    minHeight: '100vh',
  },
  heroSection: {
    position: 'relative',
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    overflow: 'hidden',
  },
  videoBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    zIndex: 0,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(0, 0, 0, 0.68)',
    zIndex: 1,
  },
  heroContent: {
    position: 'relative',
    zIndex: 2,
    width: '100%',
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '2.5rem',
    alignItems: 'center',
  },
  titleContainer: {
    maxWidth: '600px',
  },
  heroTitle: {
    fontSize: '3.2rem',
    lineHeight: '1.1',
    fontWeight: '800',
    fontFamily: 'var(--font-display)',
    textShadow: '0 4px 10px rgba(0,0,0,0.5)',
  },
  heroSubText: {
    fontSize: '1.1rem',
    color: 'var(--text-muted)',
    marginTop: '1.5rem',
    lineHeight: '1.6',
  },
  statsCard: {
    padding: '2.5rem',
    maxWidth: '420px',
    justifySelf: 'start',
  },
  statsHeader: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.25rem',
    marginBottom: '1.5rem',
    textAlign: 'center',
  },
  loadingStats: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    color: 'var(--text-muted)',
    padding: '1rem 0',
  },
  counterRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1.5rem',
  },
  counterBlock: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  counterNumber: {
    fontSize: '3.5rem',
    fontWeight: '800',
    color: 'var(--success)',
    fontFamily: 'var(--font-display)',
    lineHeight: '1',
  },
  counterLabel: {
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    marginTop: '0.25rem',
    letterSpacing: '0.05em',
  },
  counterDivider: {
    fontSize: '2.5rem',
    color: 'var(--border-color)',
    fontWeight: '300',
  },
  featuresSection: {
    padding: '6rem 0',
    background: 'var(--background)',
  },
  sectionTitle: {
    textAlign: 'center',
    fontSize: '2.2rem',
    marginBottom: '3.5rem',
    fontFamily: 'var(--font-display)',
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '2rem',
  },
  featureCard: {
    padding: '2.5rem',
    textAlign: 'center',
  },
  featureHeading: {
    fontSize: '1.3rem',
    marginBottom: '0.75rem',
    fontFamily: 'var(--font-display)',
  },
  featureText: {
    color: 'var(--text-muted)',
    fontSize: '0.95rem',
    lineHeight: '1.5',
  },
};

// CSS injected styles to handle layouts
const injectHeroGrid = () => {
  const style = document.createElement('style');
  style.innerHTML = `
    @media (min-width: 992px) {
      .hero-grid-container {
        grid-template-columns: 1.2fr 0.8fr !important;
      }
    }
    .spin {
      animation: spin 1s linear infinite;
    }
  `;
  document.head.appendChild(style);
};
if (typeof document !== 'undefined') injectHeroGrid();

export default LandingPage;
