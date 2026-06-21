import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { SocketContext } from '../context/SocketContext';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { RefreshCw, Car, Flame, Accessibility, CheckCircle2, UserCheck } from 'lucide-react';

const getEmbedMapUrl = (mapLink, address) => {
  if (!mapLink || typeof mapLink !== 'string') {
    return `https://maps.google.com/maps?q=${encodeURIComponent(address)}&t=&z=14&ie=UTF8&iwloc=&output=embed`;
  }

  const trimmed = mapLink.trim();
  let url = trimmed;

  // 1. Check if it's an iframe code
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

const ParkingMap = () => {
  const socket = useContext(SocketContext);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [floor, setFloor] = useState('Ground');
  const [spots, setSpots] = useState([]);
  const [userActiveBookingIds, setUserActiveBookingIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [floors, setFloors] = useState(['Ground', '1st', '2nd']);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [branchConfigs, setBranchConfigs] = useState([]);
  const [showLocationMap, setShowLocationMap] = useState(false);

  // Fetch spots for the floor and branch
  const fetchFloorSpots = async (selectedFloor, branchName) => {
    if (!branchName) return;
    try {
      const res = await axios.get(`/api/spots/${selectedFloor}?branch=${encodeURIComponent(branchName)}`);
      if (res.data.success) {
        setSpots(res.data.data || []);
      }
    } catch (err) {
      toast.error('Error fetching parking floor status');
    }
  };

  // Fetch branches list
  const fetchBranches = async () => {
    try {
      const res = await axios.get('/api/footer');
      if (res.data.success && res.data.data) {
        setBranches(res.data.data.branches || []);
        setBranchConfigs(res.data.data.branchConfigs || []);
        if (res.data.data.branches && res.data.data.branches.length > 0) {
          setSelectedBranch(prev => prev || res.data.data.branches[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching branches:', err.message);
    }
  };

  // Fetch user active booking IDs to color them purple
  const fetchUserBookings = async () => {
    if (!user) return;
    try {
      const res = await axios.get('/api/bookings/my');
      if (res.data.success) {
        const activeIds = (res.data.data || [])
          .filter(b => b && b.status === 'active')
          .map(b => b._id);
        setUserActiveBookingIds(new Set(activeIds));
      }
    } catch (err) {
      console.error('Error fetching user bookings:', err.message);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchBranches(), fetchUserBookings()]);
  };

  useEffect(() => {
    // Initial load
    const initLoad = async () => {
      setLoading(true);
      await fetchBranches();
      await fetchUserBookings();
      setLoading(false);
    };
    initLoad();
  }, [user]);

  useEffect(() => {
    if (selectedBranch) {
      setLoading(true);
      fetchFloorSpots(floor, selectedBranch).finally(() => setLoading(false));
    }
  }, [floor, selectedBranch]);

  useEffect(() => {
    // Socket listener for live updates
    if (socket) {
      socket.on('spotStatusChanged', (updatedSpot) => {
        // Update local spots array if the spot is on the current floor and branch
        if (updatedSpot.floor === floor && updatedSpot.branch === selectedBranch) {
          setSpots((prevSpots) =>
            prevSpots.map((s) => (s._id === updatedSpot.spotId ? { ...s, status: updatedSpot.status, currentBookingId: updatedSpot.currentBookingId } : s))
          );
        }
        
        // Refresh user bookings just in case status changed for user booking
        fetchUserBookings();
      });
    }

    return () => {
      if (socket) {
        socket.off('spotStatusChanged');
      }
    };
  }, [socket, floor, selectedBranch]);

  // Socket listener for footer/branch changes
  useEffect(() => {
    if (socket) {
      const handleFooterUpdated = (updatedConfig) => {
        if (updatedConfig) {
          setBranches(updatedConfig.branches || []);
          setBranchConfigs(updatedConfig.branchConfigs || []);
          if (updatedConfig.branches && updatedConfig.branches.length > 0) {
            setSelectedBranch(prev => updatedConfig.branches.includes(prev) ? prev : updatedConfig.branches[0]);
          } else {
            setSelectedBranch('');
          }
        }
      };
      socket.on('footerUpdated', handleFooterUpdated);
      return () => {
        socket.off('footerUpdated', handleFooterUpdated);
      };
    }
  }, [socket]);

  const handleSpotClick = (spot) => {
    setSelectedSpot(spot);
  };

  const handleBookSpot = (spot) => {
    if (!user) {
      toast.error('Please log in to book a parking spot');
      return navigate('/login');
    }
    
    if (spot.status !== 'available') {
      return toast.error('This spot is already reserved or occupied');
    }

    navigate('/booking', { state: { spotId: spot._id, spotNumber: spot.spotNumber, floor: spot.floor, branch: selectedBranch } });
  };

  // Helper to determine spot color
  const getSpotColor = (spot) => {
    if (spot.currentBookingId && userActiveBookingIds.has(spot.currentBookingId.toString())) {
      return 'var(--spot-user)'; // Purple
    }
    if (spot.status === 'occupied') return 'var(--spot-occupied)'; // Red
    if (spot.status === 'reserved') return 'var(--spot-reserved)'; // Yellow
    return 'var(--spot-available)'; // Green/Cyan
  };

  const getSpotIcon = (type) => {
    if (type === 'EV') return <Flame size={16} style={{ color: '#FFD60A' }} title="EV Charger" />;
    if (type === 'handicap') return <Accessibility size={16} style={{ color: 'var(--success)' }} title="Handicap Accessible" />;
    return <Car size={16} style={{ color: 'var(--text-muted)' }} />;
  };

  return (
    <div className="page-wrapper container animate-fade-in">
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Parking Map Dashboard</h1>
          <p style={styles.subtitle}>Select a floor and choose an available space to reserve.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          {branches.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label htmlFor="branch-select" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Select Branch</label>
              <select
                id="branch-select"
                value={selectedBranch}
                onChange={(e) => { setSelectedBranch(e.target.value); setSelectedSpot(null); }}
                className="form-input"
                style={{ 
                  background: 'rgba(255,255,255,0.03)', 
                  border: '1px solid var(--border-color)', 
                  color: '#fff', 
                  borderRadius: '8px', 
                  padding: '0.55rem 2rem 0.55rem 1rem', 
                  cursor: 'pointer',
                  fontWeight: '600',
                  minWidth: '160px',
                  outline: 'none'
                }}
              >
                {branches.map((b) => (
                  <option key={b} value={b} style={{ background: '#1a1a2e', color: '#fff' }}>
                    {b} Branch
                  </option>
                ))}
              </select>
            </div>
          )}
          <button className="btn btn-outline" onClick={loadData} disabled={loading} style={{ padding: '0.6rem 1rem', height: 'fit-content' }}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} /> Refresh Map
          </button>
        </div>
      </div>

      {/* Dynamic Branch Location Panel */}
      {selectedBranch && (
        (() => {
          const config = branchConfigs.find(b => b.name === selectedBranch);
          if (!config) return null;
          return (
            <div style={styles.locationCard} className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--success)', fontFamily: 'var(--font-display)', fontWeight: 'bold' }}>
                    📍 {config.name} Branch Location
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text)' }}>
                    {config.address}
                  </p>
                  {(config.phone || config.email) && (
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {config.phone && <span>📞 {config.phone}</span>}
                      {config.email && <span>✉️ {config.email}</span>}
                    </div>
                  )}
                </div>
                {config.address && (
                  <button 
                    onClick={() => setShowLocationMap(!showLocationMap)}
                    className="btn btn-outline"
                    style={{ padding: '0.45rem 1rem', fontSize: '0.8rem', height: 'fit-content', cursor: 'pointer' }}
                  >
                    {showLocationMap ? 'Hide Map' : 'View Location Map'}
                  </button>
                )}
              </div>
              {showLocationMap && config.address && (
                <div style={{ marginTop: '1rem', height: '240px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative' }}>
                  <iframe 
                    src={getEmbedMapUrl(config.mapLink, config.address)}
                    width="100%" 
                    height="100%" 
                    style={{ border: 0 }} 
                    allowFullScreen="" 
                    loading="lazy"
                    title="Branch Map"
                  ></iframe>
                  <a 
                    href={getMapExternalUrl(config.mapLink, config.address)}
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="btn btn-primary"
                    style={{ 
                      position: 'absolute', 
                      top: '10px', 
                      left: '10px', 
                      padding: '0.45rem 1rem', 
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                      textDecoration: 'none',
                      borderRadius: '6px',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                      zIndex: 10,
                      cursor: 'pointer'
                    }}
                  >
                    Open in Maps
                  </a>
                </div>
              )}
            </div>
          );
        })()
      )}

      {/* Floor Selector Tab Bar */}
      <div style={styles.tabContainer}>
        {floors.map((f) => (
          <button
            key={f}
            onClick={() => { setFloor(f); setSelectedSpot(null); }}
            style={floor === f ? styles.activeTab : styles.tab}
          >
            {f} Floor
          </button>
        ))}
      </div>

      <div className="map-layout-grid" style={styles.mainGrid}>
        {/* Interactive Spots Layout */}
        <div style={styles.mapContainer} className="glass-card">
          <div style={styles.gateLabel}>ENTRANCE / EXIT GATE</div>
          
          {loading ? (
            <div style={styles.loadingWrapper}>
              <div className="skeleton" style={{ width: '100%', height: '300px', borderRadius: '12px' }}></div>
            </div>
          ) : (
            <div style={styles.spotsGrid}>
              {spots.map((spot) => {
                const spotColor = getSpotColor(spot);
                const isSelected = selectedSpot?._id === spot._id;
                
                return (
                  <button
                    key={spot._id}
                    onClick={() => handleSpotClick(spot)}
                    style={{
                      ...styles.spotBtn,
                      borderColor: isSelected ? '#fff' : spotColor,
                      boxShadow: isSelected ? `0 0 15px ${spotColor}` : 'none',
                    }}
                  >
                    <div style={{ ...styles.spotHeader, background: spotColor }}>
                      <span style={styles.spotNumText}>{spot.spotNumber}</span>
                    </div>
                    <div style={styles.spotBody}>
                      {getSpotIcon(spot.type)}
                      <span style={styles.spotTypeText}>{spot.type}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Color Legend */}
          <div style={styles.legendContainer}>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendDot, background: 'var(--spot-available)' }}></div>
              <span>Available</span>
            </div>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendDot, background: 'var(--spot-occupied)' }}></div>
              <span>Occupied</span>
            </div>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendDot, background: 'var(--spot-reserved)' }}></div>
              <span>Reserved</span>
            </div>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendDot, background: 'var(--spot-user)' }}></div>
              <span>Your Booking</span>
            </div>
          </div>
        </div>

        {/* Spot Detail Sidebar Panel */}
        <div style={styles.detailsPanel} className="glass-card">
          {selectedSpot ? (
            <div style={styles.panelContent}>
              <h3 style={styles.panelTitle}>Spot {selectedSpot.spotNumber} Details</h3>
              <div style={styles.divider}></div>
              

              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Location:</span>
                <span style={styles.detailVal}>{selectedSpot.floor} Floor</span>
              </div>

              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Branch:</span>
                <span style={styles.detailVal}>{selectedSpot.branch || selectedBranch}</span>
              </div>

              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Spot Type:</span>
                <span style={{ ...styles.detailVal, textTransform: 'uppercase', fontWeight: 'bold' }}>
                  {selectedSpot.type} slot
                </span>
              </div>

              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Live Status:</span>
                <span style={{ 
                  ...styles.detailVal, 
                  color: getSpotColor(selectedSpot), 
                  fontWeight: '600',
                  textTransform: 'capitalize' 
                }}>
                  {selectedSpot.status}
                </span>
              </div>

              <div style={{ ...styles.divider, margin: '1.5rem 0' }}></div>

              {selectedSpot.status === 'available' ? (
                <button 
                  onClick={() => handleBookSpot(selectedSpot)} 
                  className="btn btn-success" 
                  style={{ width: '100%' }}
                >
                  Proceed to Book
                </button>
              ) : (
                <div style={styles.occupiedAlert}>
                  {selectedSpot.currentBookingId && userActiveBookingIds.has(selectedSpot.currentBookingId.toString()) ? (
                    <div style={styles.statusBox}>
                      <UserCheck size={20} color="var(--spot-user)" />
                      <span style={{ color: 'var(--spot-user)' }}>This is your active booking. Access details in My Bookings page.</span>
                    </div>
                  ) : (
                    <div style={styles.statusBox}>
                      <Flame size={20} color="var(--spot-occupied)" />
                      <span>This space is currently filled. Select another spot.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div style={styles.noSelection}>
              <Car size={40} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
              <p>Click on any parking spot on the map layout grid to view real-time parameters and book.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  locationCard: {
    padding: '1.25rem',
    marginBottom: '1.5rem',
    borderRadius: '16px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid var(--border-color)',
    animation: 'fadeIn 0.3s ease',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '2rem',
  },
  subtitle: {
    color: 'var(--text-muted)',
    fontSize: '0.95rem',
  },
  tabContainer: {
    display: 'flex',
    gap: '0.75rem',
    marginBottom: '1.5rem',
  },
  tab: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-muted)',
    padding: '0.6rem 1.2rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: 'var(--font-display)',
    fontWeight: '600',
    transition: 'all 0.2s',
  },
  activeTab: {
    background: 'var(--accent)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff',
    padding: '0.6rem 1.2rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: 'var(--font-display)',
    fontWeight: '600',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '2rem',
  },
  mapContainer: {
    padding: '2rem',
    position: 'relative',
  },
  gateLabel: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px dashed var(--border-color)',
    padding: '0.5rem',
    textAlign: 'center',
    borderRadius: '8px',
    fontSize: '0.8rem',
    fontWeight: '700',
    letterSpacing: '0.1em',
    color: 'var(--text-muted)',
    marginBottom: '2rem',
  },
  loadingWrapper: {
    width: '100%',
  },
  spotsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
    gap: '1rem',
  },
  spotBtn: {
    background: 'rgba(13, 13, 13, 0.4)',
    border: '2px solid',
    borderRadius: '8px',
    padding: '0',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    display: 'flex',
    flexDirection: 'column',
    height: '90px',
  },
  spotHeader: {
    width: '100%',
    padding: '0.2rem 0.5rem',
    textAlign: 'center',
  },
  spotNumText: {
    fontFamily: 'var(--font-display)',
    fontWeight: '700',
    fontSize: '0.9rem',
    color: '#0f172a',
  },
  spotBody: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    padding: '0.5rem',
  },
  spotTypeText: {
    fontSize: '0.65rem',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    fontWeight: '600',
  },
  legendContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1.5rem',
    marginTop: '2.5rem',
    borderTop: '1px solid var(--border-color)',
    paddingTop: '1.5rem',
    justifyContent: 'center',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
  },
  legendDot: {
    width: '12px',
    height: '12px',
    borderRadius: '4px',
  },
  detailsPanel: {
    padding: '2rem',
    height: 'fit-content',
  },
  panelContent: {
    width: '100%',
  },
  panelTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.25rem',
  },
  divider: {
    height: '1px',
    background: 'var(--border-color)',
    margin: '1rem 0',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    margin: '0.75rem 0',
    fontSize: '0.9rem',
  },
  detailLabel: {
    color: 'var(--text-muted)',
  },
  detailVal: {
    color: '#fff',
    fontWeight: '500',
  },
  occupiedAlert: {
    padding: '1rem',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
  },
  statusBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
  },
  noSelection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '3rem 1rem',
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
  },
};

// Injected styles to handle responsive map grids
const injectMapLayout = () => {
  const style = document.createElement('style');
  style.innerHTML = `
    @media (min-width: 992px) {
      .container {
        max-width: 1200px;
      }
      .map-layout-grid {
        grid-template-columns: 1.4fr 0.6fr !important;
      }
    }
  `;
  document.head.appendChild(style);
};
if (typeof document !== 'undefined') injectMapLayout();

export default ParkingMap;
