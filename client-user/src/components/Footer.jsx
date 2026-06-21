import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { ParkingSquare, Clock } from 'lucide-react';
import axios from 'axios';
import { SocketContext } from '../context/SocketContext';

const getSocialUrl = (platform, value) => {
  if (platform === 'whatsapp') {
    return `https://wa.me/${value}`;
  }
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }
  return `https://${value}`;
};

const getEmbedMapUrl = (mapLink, address) => {
  if (!mapLink || typeof mapLink !== 'string') {
    return `https://maps.google.com/maps?q=${encodeURIComponent(address)}&t=&z=14&ie=UTF8&iwloc=&output=embed`;
  }

  const trimmed = mapLink.trim();

  // 1. Check if it's an iframe code
  let url = trimmed;
  if (trimmed.startsWith('<iframe') || trimmed.includes('<iframe')) {
    const srcMatch = trimmed.match(/src=["'](https?:\/\/[^"']+)["']/i);
    if (srcMatch && srcMatch[1]) {
      url = srcMatch[1];
    }
  }

  // 2. If it's already an embed URL, return it
  if (url.includes('/embed') || url.includes('output=embed')) {
    return url;
  }

  // 2.5 Try to extract coordinates (lat,lng) from parameters like ll or raw pattern
  const generalCoordsMatch = url.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
  if (generalCoordsMatch && generalCoordsMatch[1] && generalCoordsMatch[2]) {
    const lat = parseFloat(generalCoordsMatch[1]);
    const lng = parseFloat(generalCoordsMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      const zMatch = url.match(/[?&]z=([^&#]+)/i);
      const z = (zMatch && zMatch[1]) ? zMatch[1] : '14';
      return `https://maps.google.com/maps?q=${lat},${lng}&t=&z=${z}&ie=UTF8&iwloc=&output=embed`;
    }
  }

  // 3. Try to extract query parameter 'q' or 'query'
  try {
    const urlObj = new URL(url);
    const qParam = urlObj.searchParams.get('q') || urlObj.searchParams.get('query');
    if (qParam) {
      return `https://maps.google.com/maps?q=${encodeURIComponent(qParam)}&t=&z=14&ie=UTF8&iwloc=&output=embed`;
    }
  } catch (e) {
    const qMatch = url.match(/[?&](q|query)=([^&#]+)/i);
    if (qMatch && qMatch[2]) {
      return `https://maps.google.com/maps?q=${qMatch[2]}&t=&z=14&ie=UTF8&iwloc=&output=embed`;
    }
  }

  // 4. Try to extract /place/Name
  const placeMatch = url.match(/\/place\/([^/@?#]+)/i);
  if (placeMatch && placeMatch[1]) {
    return `https://maps.google.com/maps?q=${placeMatch[1]}&t=&z=14&ie=UTF8&iwloc=&output=embed`;
  }

  // 5. Try to extract coordinates @lat,lng
  const coordsMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (coordsMatch && coordsMatch[1] && coordsMatch[2]) {
    return `https://maps.google.com/maps?q=${coordsMatch[1]},${coordsMatch[2]}&t=&z=14&ie=UTF8&iwloc=&output=embed`;
  }

  // 6. Short links fallback to address
  if (url.includes('maps.app.goo.gl') || url.includes('goo.gl/maps')) {
    return `https://maps.google.com/maps?q=${encodeURIComponent(address)}&t=&z=14&ie=UTF8&iwloc=&output=embed`;
  }

  // 7. Unknown protocols or invalid URLs fallback
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://maps.google.com/maps?q=${encodeURIComponent(address)}&t=&z=14&ie=UTF8&iwloc=&output=embed`;
  }

  // 8. General fallback to address
  return `https://maps.google.com/maps?q=${encodeURIComponent(address)}&t=&z=14&ie=UTF8&iwloc=&output=embed`;
};

const getMapExternalUrl = (mapLink, address) => {
  if (!mapLink || typeof mapLink !== 'string') {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  }

  const trimmed = mapLink.trim();
  let url = trimmed;

  if (trimmed.startsWith('<iframe') || trimmed.includes('<iframe')) {
    const srcMatch = trimmed.match(/src=["'](https?:\/\/[^"']+)["']/i);
    if (srcMatch && srcMatch[1]) {
      url = srcMatch[1];
    }
  }

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  }

  return url;
};

const getPlatformColor = (platform) => {
  switch (platform.toLowerCase()) {
    case 'whatsapp': return '#25D366';
    case 'instagram': return 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)';
    case 'twitter':
    case 'x': return '#000000';
    case 'facebook': return '#1877F2';
    case 'tiktok': return '#000000';
    case 'youtube': return '#FF0000';
    case 'linkedin': return '#0A66C2';
    default: return '#555555';
  }
};

const renderPlatformIcon = (platform) => {
  switch (platform.toLowerCase()) {
    case 'whatsapp':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.706 1.463h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      );
    case 'instagram':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="white">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
        </svg>
      );
    case 'twitter':
    case 'x':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="white">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      );
    case 'facebook':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="white">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      );
    case 'tiktok':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="white">
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.86-.74-3.99-1.72-.08-.07-.17-.17-.25-.26V14c.02 2.78-1.56 5.48-4.12 6.63-2.56 1.15-5.75.92-8.08-.62-2.33-1.54-3.52-4.47-3.01-7.23.51-2.76 2.76-5.01 5.51-5.51 1.7-.31 3.48-.09 5 .62v4.2c-.85-.5-1.84-.69-2.82-.53-1.39.23-2.62 1.34-3 2.72-.38 1.38-.04 2.94.91 3.97.95 1.03 2.44 1.44 3.79 1.05 1.35-.39 2.39-1.59 2.65-2.99.04-.25.07-.5.07-.75V.02z"/>
        </svg>
      );
    case 'youtube':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="white">
          <path d="M23.498 6.163a3.003 3.003 0 00-2.11-2.108C19.53 3.5 12 3.5 12 3.5s-7.53 0-9.388.555A3.003 3.003 0 00.502 6.163C0 8.02 0 12 0 12s0 3.98.502 5.837a3.003 3.003 0 002.11 2.108C4.47 20.5 12 20.5 12 20.5s7.53 0 9.388-.555a3.003 3.003 0 002.11-2.108C24 15.98 24 12 24 12s0-3.98-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      );
    case 'linkedin':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="white">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z"/>
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="2" y1="12" x2="22" y2="12"></line>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
        </svg>
      );
  }
};

const defaultFooter = {
  description: 'Your premium global parking partner, delivering exceptional parking experiences with real-time space locks and intelligent facility scoring.',
  address: '26st Lazarus road, Periyamulla, Negombo',
  phone: '+94 77 431 1051',
  email: 'support@parksmart.com',
  branches: ['Colombo', 'Wattala', 'Negombo', 'Jaffna', 'Kandy', 'Minuwangoda'],
  workingHours: '24 Hours & 7 Days',
  socials: [
    { platform: 'whatsapp', value: '94774311051', showIcon: true },
    { platform: 'instagram', value: 'https://instagram.com', showIcon: true },
    { platform: 'twitter', value: 'https://x.com', showIcon: true },
    { platform: 'facebook', value: 'https://facebook.com', showIcon: true },
    { platform: 'tiktok', value: 'https://tiktok.com', showIcon: true }
  ]
};

const Footer = () => {
  const socket = useContext(SocketContext);
  const [config, setConfig] = useState(defaultFooter);
  const [selectedFooterBranch, setSelectedFooterBranch] = useState('');

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await axios.get('/api/footer');
        if (res.data.success && res.data.data) {
          setConfig(res.data.data);
        }
      } catch (err) {
        console.error('Error fetching footer config:', err.message);
      }
    };

    fetchConfig();

    if (socket) {
      const handleUpdate = (updatedConfig) => {
        if (updatedConfig) {
          setConfig(updatedConfig);
        }
      };
      socket.on('footerUpdated', handleUpdate);
      return () => {
        socket.off('footerUpdated', handleUpdate);
      };
    }
  }, [socket]);

  // When config.branches loads, default selectedFooterBranch to the first one
  useEffect(() => {
    if (config && config.branches && config.branches.length > 0 && !selectedFooterBranch) {
      setSelectedFooterBranch(config.branches[0]);
    }
  }, [config, selectedFooterBranch]);

  const currentBranchConfig = (config.branchConfigs || []).find(
    (b) => b.name === selectedFooterBranch
  ) || {
    name: selectedFooterBranch,
    address: config.address,
    mapLink: config.mapLink,
    phone: config.phone,
    email: config.email
  };

  const hasSocials = Array.isArray(config.socials) && config.socials.some(
    (social) => social.value && social.showIcon !== false
  );

  return (
    <footer style={styles.footer}>
      <div className="footer-container" style={styles.container}>
        <div className="footer-grid" style={styles.grid}>
          {/* Column 1: Branding & Socials */}
          <div style={styles.column}>
            <div style={styles.logo}>
              <ParkingSquare size={24} color="#FFC107" />
              <span style={styles.logoText}>ParkSmart</span>
            </div>
            <p style={styles.desc}>
              {config.description}
            </p>
            {hasSocials && (
              <div style={styles.socials}>
                {config.socials.map((social, index) => {
                  if (!social.value || social.showIcon === false) return null;
                  return (
                    <a 
                      key={index} 
                      href={getSocialUrl(social.platform, social.value)} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      style={{ ...styles.socialIcon, background: getPlatformColor(social.platform) }} 
                      aria-label={social.platform}
                    >
                      {renderPlatformIcon(social.platform)}
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* Column 2: Contact & Location */}
          <div style={styles.column}>
            <h4 style={styles.sectionHeader}>Contact & Location</h4>
            <div style={styles.contactGroup}>
              <span style={styles.contactLabel}>Address:</span>
              <span style={styles.contactVal}>{currentBranchConfig.address || config.address}</span>
            </div>
            <div style={styles.contactGroup}>
              <span style={styles.contactLabel}>Phone:</span>
              <a href={`tel:${(currentBranchConfig.phone || config.phone).replace(/\s+/g, '')}`} style={styles.contactValLink}>{currentBranchConfig.phone || config.phone}</a>
            </div>
            <div style={styles.contactGroup}>
              <span style={styles.contactLabel}>Email:</span>
              <a href={`mailto:${currentBranchConfig.email || config.email}`} style={styles.contactValLink}>{currentBranchConfig.email || config.email}</a>
            </div>
          </div>

          {/* Column 3: Our Branches */}
          <div style={styles.column}>
            <h4 style={styles.sectionHeader}>Our Branches</h4>
            <ul style={styles.branchList}>
              {config.branches.map((branch, idx) => (
                <li 
                  key={idx} 
                  onClick={() => setSelectedFooterBranch(branch)}
                  style={{
                    ...styles.branchItem,
                    cursor: 'pointer',
                    color: selectedFooterBranch === branch ? '#FFC107' : 'var(--text-muted)',
                    fontWeight: selectedFooterBranch === branch ? 'bold' : 'normal',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {selectedFooterBranch === branch && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FFC107' }}></span>}
                  {branch}
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Working Hours & Map */}
          <div style={styles.column}>
            <h4 style={styles.sectionHeader}>Working Hours</h4>
            <div style={styles.workingHoursRow}>
              <Clock size={16} color="#FFC107" style={{ marginRight: 6 }} />
              <span style={styles.workingHoursVal}>{config.workingHours}</span>
            </div>
            {config.showMap !== false && (
              <div style={styles.mapContainer}>
                <iframe 
                  src={getEmbedMapUrl(currentBranchConfig.mapLink || config.mapLink, currentBranchConfig.address || config.address)}
                  width="100%" 
                  height="100%" 
                  style={{ border: 0, borderRadius: '8px' }} 
                  allowFullScreen="" 
                  loading="lazy"
                  title="Location Map"
                ></iframe>
                <a 
                  href={getMapExternalUrl(currentBranchConfig.mapLink || config.mapLink, currentBranchConfig.address || config.address)}
                  target="_blank" 
                  rel="noopener noreferrer" 
                  style={styles.mapsBtn}
                >
                  Maps ↗
                </a>
              </div>
            )}
          </div>
        </div>

        <div style={styles.divider}></div>

        {/* Bottom Bar */}
        <div style={styles.bottomBar}>
          <div style={styles.legalLinks}>
            <a href="#" style={styles.legalLink}>Privacy Policy</a>
            <a href="#" style={styles.legalLink}>Terms of Service</a>
            <a href="#" style={styles.legalLink}>Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

const styles = {
  footer: {
    background: '#0D0D1E',
    borderTop: '1px solid var(--border-color)',
    padding: '2rem 0 1rem 0',
    marginTop: 'auto',
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
  },
  grid: {
    display: 'grid',
    gap: '5rem',
  },
  column: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.5rem',
  },
  logoText: {
    fontFamily: 'var(--font-display)',
    fontWeight: '800',
    fontSize: '1.4rem',
    color: '#FFC107',
    letterSpacing: '0.02em',
  },
  desc: {
    color: 'var(--text-muted)',
    fontSize: '0.88rem',
    lineHeight: '1.6',
    margin: 0,
  },
  socials: {
    display: 'flex',
    gap: '0.75rem',
    marginTop: '0.5rem',
  },
  socialIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    color: 'white',
    transition: 'all 0.2s ease',
    textDecoration: 'none',
  },
  sectionHeader: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.05rem',
    color: '#fff',
    fontWeight: '700',
    marginBottom: '0.5rem',
    margin: 0,
  },
  contactGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  contactLabel: {
    color: '#fff',
    fontWeight: '700',
    fontSize: '0.9rem',
    marginBottom: '2px',
  },
  contactVal: {
    color: 'var(--text-muted)',
    fontSize: '0.88rem',
    lineHeight: '1.4',
  },
  contactValLink: {
    color: 'var(--text-muted)',
    fontSize: '0.88rem',
    lineHeight: '1.4',
    textDecoration: 'none',
    transition: 'color 0.2s',
    ':hover': {
      color: '#fff',
    },
  },
  branchList: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
    padding: 0,
    margin: 0,
  },
  branchItem: {
    color: 'var(--text-muted)',
    fontSize: '0.88rem',
  },
  workingHoursRow: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '0.5rem',
  },
  workingHoursVal: {
    color: '#FFC107',
    fontWeight: '700',
    fontSize: '0.9rem',
  },
  mapContainer: {
    position: 'relative',
    height: '100px',
    width: '100%',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  mapsBtn: {
    position: 'absolute',
    top: '10px',
    left: '10px',
    background: '#fff',
    color: '#1a73e8',
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '600',
    textDecoration: 'none',
    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
  },
  divider: {
    height: '1px',
    background: 'var(--border-color)',
    width: '100%',
  },
  bottomBar: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem',
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
  },
  legalLinks: {
    display: 'flex',
    gap: '1.5rem',
  },
  legalLink: {
    color: 'var(--text-muted)',
    textDecoration: 'none',
    transition: 'color 0.2s',
  },
  bottomText: {
    margin: 0,
  },
};

export default Footer;
