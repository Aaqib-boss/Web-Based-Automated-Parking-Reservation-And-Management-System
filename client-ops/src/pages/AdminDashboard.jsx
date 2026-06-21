import React, { useState, useEffect, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { SocketContext } from '../context/SocketContext';
import { toast } from 'react-hot-toast';
import { RefreshCw, Layers, Trash2 } from 'lucide-react';

const AdminDashboard = () => {
  const socket = useContext(SocketContext);
  const location = useLocation();

  const showDashboard = location.pathname === '/dashboard';
  const showBookings = location.pathname === '/dashboard/bookings';
  const showRates = location.pathname === '/dashboard/rates';
  
  const [spots, setSpots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [pricingForm, setPricingForm] = useState({
    baseRate: 30,
    twoHourRate: 50,
    fourHourRate: 90,
    fullDayRate: 150,
  });
  const [savingPricing, setSavingPricing] = useState(false);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');

  const handleUpdateSpotStatus = async (spotId, newStatus) => {
    setUpdatingStatus(true);
    try {
      const res = await axios.patch(`/api/spots/${spotId}/status`, { status: newStatus });
      if (res.data.success) {
        toast.success(`Spot status updated to ${newStatus}`);
        setSpots(prevSpots => prevSpots.map(s => s._id === spotId ? { ...s, status: newStatus } : s));
        setSelectedSpot(null);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update spot status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await axios.get('/api/footer');
      if (res.data.success && res.data.data && res.data.data.branches) {
        setBranches(res.data.data.branches);
        if (res.data.data.branches.length > 0) {
          setSelectedBranch(prev => prev || res.data.data.branches[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching branches:', err.message);
    }
  };

  const fetchSpots = async (branchName) => {
    if (!branchName) return;
    try {
      const res = await axios.get(`/api/spots?branch=${encodeURIComponent(branchName)}`);
      if (res.data.success) {
        setSpots(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching spots:', err.message);
      toast.error('Failed to load spot status');
    }
  };

  const fetchPricingConfig = async (branchName) => {
    if (!branchName) return;
    try {
      const res = await axios.get(`/api/pricing?branch=${encodeURIComponent(branchName)}`);
      if (res.data.success && res.data.data) {
        const d = res.data.data;
        setPricingForm({
          baseRate: d.baseRate || 30,
          twoHourRate: d.twoHourRate || 50,
          fourHourRate: d.fourHourRate || 90,
          fullDayRate: d.fullDayRate || 150,
        });
      }
    } catch (err) {
      console.error('Error fetching pricing config:', err.message);
    }
  };

  const handleUpdatePricing = async (e) => {
    e.preventDefault();
    setSavingPricing(true);
    try {
      const res = await axios.put(`/api/pricing?branch=${encodeURIComponent(selectedBranch)}`, pricingForm);
      if (res.data.success) {
        toast.success('Parking pricing rates updated successfully!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update pricing rates');
    } finally {
      setSavingPricing(false);
    }
  };

  const fetchAllBookings = async () => {
    try {
      const res = await axios.get('/api/bookings/all');
      if (res.data.success) {
        setBookings(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching all bookings:', err.message);
    }
  };

  const handleDeleteBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to delete this booking reservation?')) {
      return;
    }
    try {
      const res = await axios.delete(`/api/bookings/${bookingId}`);
      if (res.data.success) {
        toast.success(res.data.message || 'Booking deleted successfully');
        loadAllData(true);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete booking');
    }
  };

  const loadAllData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    await Promise.all([
      fetchBranches(),
      fetchAllBookings()
    ]);

    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    if (selectedBranch) {
      fetchSpots(selectedBranch);
      fetchPricingConfig(selectedBranch);
    }
  }, [selectedBranch]);

  useEffect(() => {
    loadAllData();

    // Auto-refresh spots every 30 seconds
    const interval = setInterval(() => {
      if (selectedBranch) {
        fetchSpots(selectedBranch);
      }
      fetchAllBookings();
    }, 30000);

    // Socket listener for live updates
    if (socket) {
      socket.on('spotStatusChanged', (updatedSpot) => {
        if (updatedSpot.branch === selectedBranch) {
          setSpots((prevSpots) =>
            prevSpots.map((s) => (s._id === updatedSpot.spotId ? { ...s, status: updatedSpot.status } : s))
          );
        }
      });
    }

    return () => {
      clearInterval(interval);
      if (socket) {
        socket.off('spotStatusChanged');
      }
    };
  }, [socket, selectedBranch]);

  // Socket listener for footer/branch changes
  useEffect(() => {
    if (socket) {
      const handleFooterUpdated = (updatedConfig) => {
        if (updatedConfig && updatedConfig.branches) {
          setBranches(updatedConfig.branches);
          if (updatedConfig.branches.length > 0) {
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

  const getFloorBreakdown = () => {
    const breakdown = {};
    spots.forEach((spot) => {
      const floor = spot.floor;
      if (!breakdown[floor]) {
        breakdown[floor] = { _id: floor, available: 0, occupied: 0, reserved: 0 };
      }
      if (spot.status === 'available') breakdown[floor].available++;
      else if (spot.status === 'occupied') breakdown[floor].occupied++;
      else if (spot.status === 'reserved') breakdown[floor].reserved++;
    });
    return Object.values(breakdown);
  };

  const getSpotColor = (status) => {
    if (status === 'occupied') return 'var(--spot-occupied)';
    if (status === 'reserved') return 'var(--spot-reserved)';
    return 'var(--spot-available)';
  };

  const filteredBookings = selectedBranch 
    ? bookings.filter(b => b.spotId?.branch === selectedBranch)
    : bookings;

  return (
    <div className="page-wrapper container animate-fade-in" style={{ paddingBottom: '6rem' }}>
      {showDashboard && (
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Operations Panel</h1>
            <p style={styles.subtitle}>Real-time spot monitoring and manual capacity override control.</p>
          </div>
          <div style={styles.headerActions}>
            {branches.length > 0 && (
              <select
                value={selectedBranch}
                onChange={(e) => { setSelectedBranch(e.target.value); setSelectedSpot(null); }}
                className="form-input"
                style={{ 
                  background: 'rgba(255,255,255,0.03)', 
                  border: '1px solid var(--border-color)', 
                  color: '#fff', 
                  borderRadius: '8px', 
                  padding: '0.5rem 2rem 0.5rem 1rem', 
                  cursor: 'pointer',
                  fontWeight: '600',
                  outline: 'none',
                  margin: 0
                }}
              >
                {branches.map((b) => (
                  <option key={b} value={b} style={{ background: '#1e1e2e', color: '#fff' }}>
                    {b} Branch
                  </option>
                ))}
              </select>
            )}
            <button className="btn btn-primary" onClick={() => loadAllData(true)} disabled={refreshing}>
              <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
              {refreshing ? 'Refreshing...' : 'Sync Data'}
            </button>
          </div>
        </div>
      )}

      {showBookings && (
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>User Bookings</h1>
            <p style={styles.subtitle}>Manage and monitor all customer parking reservations.</p>
          </div>
          <div style={styles.headerActions}>
            {branches.length > 0 && (
              <select
                value={selectedBranch}
                onChange={(e) => { setSelectedBranch(e.target.value); setSelectedSpot(null); }}
                className="form-input"
                style={{ 
                  background: 'rgba(255,255,255,0.03)', 
                  border: '1px solid var(--border-color)', 
                  color: '#fff', 
                  borderRadius: '8px', 
                  padding: '0.5rem 2rem 0.5rem 1rem', 
                  cursor: 'pointer',
                  fontWeight: '600',
                  outline: 'none',
                  margin: 0
                }}
              >
                {branches.map((b) => (
                  <option key={b} value={b} style={{ background: '#1e1e2e', color: '#fff' }}>
                    {b} Branch
                  </option>
                ))}
              </select>
            )}
            <button className="btn btn-primary" onClick={() => loadAllData(true)} disabled={refreshing}>
              <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
              {refreshing ? 'Refreshing...' : 'Sync Data'}
            </button>
          </div>
        </div>
      )}

      {showRates && (
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Parking Rates</h1>
            <p style={styles.subtitle}>Configure and customize hourly billing rates for parking spots.</p>
          </div>
          <div style={styles.headerActions}>
            {branches.length > 0 && (
              <select
                value={selectedBranch}
                onChange={(e) => { setSelectedBranch(e.target.value); setSelectedSpot(null); }}
                className="form-input"
                style={{ 
                  background: 'rgba(255,255,255,0.03)', 
                  border: '1px solid var(--border-color)', 
                  color: '#fff', 
                  borderRadius: '8px', 
                  padding: '0.5rem 2rem 0.5rem 1rem', 
                  cursor: 'pointer',
                  fontWeight: '600',
                  outline: 'none',
                  margin: 0
                }}
              >
                {branches.map((b) => (
                  <option key={b} value={b} style={{ background: '#1e1e2e', color: '#fff' }}>
                    {b} Branch
                  </option>
                ))}
              </select>
            )}
            <button className="btn btn-primary" onClick={() => loadAllData(true)} disabled={refreshing}>
              <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
              {refreshing ? 'Refreshing...' : 'Sync Data'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={styles.loadingStats}>
          <div className="skeleton" style={{ height: '300px', borderRadius: '12px', marginTop: '2rem' }}></div>
        </div>
      ) : (
        <>
          {showDashboard && (
          <div style={styles.dashboardSection}>
            {/* Live Spot status */}
            <div style={styles.liveGridCard} className="glass-card">
              <h3 style={styles.chartTitle}>Live Floor Capacity Status</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '-1.25rem', marginBottom: '1.5rem' }}>
                Click on any spot dot below to manually override its status (Available, Occupied, Reserved).
              </p>
              <div style={styles.floorPills}>
                {getFloorBreakdown().map((floor) => (
                  <div key={floor._id} style={styles.floorStatusRow}>
                    <span style={styles.floorName}><Layers size={14} style={{ marginRight: 4 }} /> {floor._id} Floor:</span>
                    <div style={styles.floorCaps}>
                      <span style={{ color: 'var(--success)' }}>{floor.available} available</span>
                      <span style={{ color: 'var(--highlight)' }}>{floor.occupied} occupied</span>
                      <span style={{ color: '#FFD60A' }}>{floor.reserved} reserved</span>
                    </div>
                  </div>
                ))}
              </div>

              <div style={styles.spotDotsGrid}>
                {spots.map((spot) => (
                  <button 
                    key={spot._id} 
                    onClick={() => setSelectedSpot(spot)}
                    className="spot-dot-btn"
                    style={{ background: getSpotColor(spot.status) }} 
                    title={`Spot: ${spot.spotNumber} (${spot.floor}) - ${spot.status}`}
                  >
                    {spot.spotNumber}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {showRates && (
          <div style={styles.dashboardSection}>
            {/* Pricing Settings Card */}
            <div style={styles.liveGridCard} className="glass-card">
              <div>
                <h3 style={styles.chartTitle}>Parking Rate Customization</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '-1.25rem', marginBottom: '1.5rem' }}>
                  Configure the billing rates for different durations (Base Rate/1 hour, 2 hours, 4 hours, and Full Day).
                </p>
              </div>
              
              <form onSubmit={handleUpdatePricing} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={styles.formGrid}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Base Rate (1 Hour - ₹)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={pricingForm.baseRate}
                      onChange={(e) => setPricingForm({ ...pricingForm, baseRate: e.target.value })}
                      placeholder="30"
                      min="0"
                      required
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">2 Hours Rate (₹)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={pricingForm.twoHourRate}
                      onChange={(e) => setPricingForm({ ...pricingForm, twoHourRate: e.target.value })}
                      placeholder="50"
                      min="0"
                      required
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">4 Hours Rate (₹)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={pricingForm.fourHourRate}
                      onChange={(e) => setPricingForm({ ...pricingForm, fourHourRate: e.target.value })}
                      placeholder="90"
                      min="0"
                      required
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Full Day Rate (24 Hours - ₹)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={pricingForm.fullDayRate}
                      onChange={(e) => setPricingForm({ ...pricingForm, fullDayRate: e.target.value })}
                      placeholder="150"
                      min="0"
                      required
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 2rem' }} disabled={savingPricing}>
                    {savingPricing ? 'Saving Rates...' : 'Save Pricing Rates'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showBookings && (
          <div style={styles.dashboardSection}>
            {/* Recent Parking Reservations & User Bookings */}
            <div style={styles.liveGridCard} className="glass-card">
              <h3 style={styles.chartTitle}>Recent Parking Reservations & User Bookings</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '-1.25rem', marginBottom: '1.5rem' }}>
                Complete list of all customer reservations, billing amounts, and real-time status.
              </p>
              {filteredBookings.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No booking records found{selectedBranch ? ` for ${selectedBranch} branch` : ''}.
                </div>
              ) : (
                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.tr}>
                        <th style={styles.th}>Booking ID</th>
                        <th style={styles.th}>User Info</th>
                        <th style={styles.th}>Vehicle No.</th>
                        <th style={styles.th}>Spot Space</th>
                        <th style={styles.th}>Schedule Timeline</th>
                        <th style={styles.th}>Duration</th>
                        <th style={styles.th}>Amount</th>
                        <th style={styles.th}>Payment Status</th>
                        <th style={styles.th}>Status</th>
                        <th style={{ ...styles.th, textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBookings.map((b) => (
                        <tr key={b._id} style={styles.trHover}>
                          <td style={{ ...styles.td, fontFamily: 'monospace', fontWeight: 'bold' }}>
                            {b.bookingId || `BK-${b._id.toString().slice(-6).toUpperCase()}`}
                          </td>
                          <td style={styles.td}>
                            <div style={{ fontWeight: 'bold' }}>{b.userId?.name || 'Guest User'}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{b.userId?.email || 'N/A'}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{b.userId?.phone || 'N/A'}</div>
                          </td>
                          <td style={styles.td}>{b.vehicleNumber}</td>
                          <td style={styles.td}>
                            <div>Spot {b.spotId?.spotNumber || 'N/A'}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{b.spotId?.floor || 'Ground'} Floor</div>
                            {b.spotId?.branch && (
                              <div style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 'bold' }}>{b.spotId.branch}</div>
                            )}
                          </td>
                          <td style={styles.td}>
                            <div style={{ fontSize: '0.85rem' }}>{new Date(b.startTime).toLocaleDateString()}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>
                          <td style={styles.td}>{b.duration} hr{b.duration > 1 ? 's' : ''}</td>
                          <td style={{ ...styles.td, color: 'var(--success)', fontWeight: 'bold' }}>₹{b.amount}</td>
                          <td style={styles.td}>
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 'bold',
                              background: b.paymentStatus === 'paid' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255, 214, 10, 0.1)',
                              border: b.paymentStatus === 'paid' ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(255, 214, 10, 0.3)',
                              color: b.paymentStatus === 'paid' ? '#22c55e' : '#FFD60A'
                            }}>
                              {b.paymentStatus}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 'bold',
                              background: b.status === 'active' ? 'rgba(0, 180, 216, 0.1)' : b.status === 'completed' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(233, 69, 96, 0.1)',
                              border: b.status === 'active' ? '1px solid rgba(0, 180, 216, 0.3)' : b.status === 'completed' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(233, 69, 96, 0.3)',
                              color: b.status === 'active' ? '#00B4D8' : b.status === 'completed' ? 'var(--text-muted)' : 'var(--highlight)'
                            }}>
                              {b.status}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <button
                              onClick={() => handleDeleteBooking(b._id)}
                              title="Delete Booking"
                              className="btn btn-outline"
                              style={{ 
                                padding: '0.5rem', 
                                borderColor: 'rgba(233, 69, 96, 0.4)', 
                                color: 'var(--highlight)',
                                background: 'rgba(233, 69, 96, 0.05)',
                                borderRadius: '8px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(233, 69, 96, 0.2)';
                                e.currentTarget.style.borderColor = 'var(--highlight)';
                                e.currentTarget.style.transform = 'scale(1.05)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(233, 69, 96, 0.05)';
                                e.currentTarget.style.borderColor = 'rgba(233, 69, 96, 0.4)';
                                e.currentTarget.style.transform = 'scale(1)';
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </>
    )}

      {/* Spot Management Modal */}
      {selectedSpot && (
        <div style={styles.modalOverlay} onClick={() => setSelectedSpot(null)}>
          <div style={styles.modalContent} className="glass-card" onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0 }}>Manage Spot {selectedSpot.spotNumber}</h3>
              <button style={styles.closeBtn} onClick={() => setSelectedSpot(null)}>×</button>
            </div>
            
            <div style={styles.modalBody}>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Floor Level:</span>
                <span style={styles.detailVal}>{selectedSpot.floor} Floor</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Spot Type:</span>
                <span style={styles.detailVal}>{selectedSpot.type}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Current Status:</span>
                <span style={{ ...styles.detailVal, color: getSpotColor(selectedSpot.status), fontWeight: 'bold', textTransform: 'capitalize' }}>
                  {selectedSpot.status}
                </span>
              </div>

              <div style={styles.divider}></div>
              <h4 style={{ marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 0 }}>
                Update Status Override
              </h4>
              
              <div style={styles.statusButtonsGroup}>
                <button 
                  onClick={() => handleUpdateSpotStatus(selectedSpot._id, 'available')}
                  className="btn btn-success"
                  style={{ width: '100%', marginBottom: '0.75rem', padding: '0.5rem' }}
                  disabled={updatingStatus || selectedSpot.status === 'available'}
                >
                  Set Available
                </button>
                <button 
                  onClick={() => handleUpdateSpotStatus(selectedSpot._id, 'occupied')}
                  className="btn btn-highlight"
                  style={{ width: '100%', marginBottom: '0.75rem', padding: '0.5rem' }}
                  disabled={updatingStatus || selectedSpot.status === 'occupied'}
                >
                  Set Occupied
                </button>
                <button 
                  onClick={() => handleUpdateSpotStatus(selectedSpot._id, 'reserved')}
                  className="btn btn-outline"
                  style={{ width: '100%', borderColor: '#FFD60A', color: '#FFD60A', padding: '0.5rem' }}
                  disabled={updatingStatus || selectedSpot.status === 'reserved'}
                >
                  Set Reserved
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  header: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1.5rem',
    marginBottom: '2.5rem',
  },
  headerActions: {
    display: 'flex',
    gap: '1rem',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '2rem',
    margin: 0,
  },
  subtitle: {
    color: 'var(--text-muted)',
    fontSize: '0.95rem',
    margin: '0.25rem 0 0 0',
  },
  loadingStats: {
    width: '100%',
  },
  dashboardSection: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '2rem',
  },
  liveGridCard: {
    padding: '2rem',
  },
  chartTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.2rem',
    marginBottom: '1.5rem',
    margin: '0 0 1.5rem 0',
  },
  floorPills: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginBottom: '2rem',
  },
  floorStatusRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.85rem',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
    paddingBottom: '0.5rem',
  },
  floorName: {
    fontWeight: '600',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
  },
  floorCaps: {
    display: 'flex',
    gap: '1rem',
  },
  spotDotsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))',
    gap: '6px',
  },
  spotDot: {
    height: '25px',
    borderRadius: '4px',
    color: '#0f172a',
    fontSize: '0.65rem',
    fontWeight: '800',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.15s, opacity 0.15s',
    ':hover': {
      transform: 'scale(1.05)',
      opacity: '0.9',
    },
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(0,0,0,0.85)',
    zIndex: 2000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1.5rem',
  },
  modalContent: {
    background: 'rgba(30,30,46,0.95)',
    padding: '2.5rem',
    maxWidth: '400px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    marginBottom: '1.5rem',
    fontFamily: 'var(--font-display)',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text)',
    fontSize: '2rem',
    cursor: 'pointer',
    lineHeight: '1',
  },
  modalBody: {
    width: '100%',
    textAlign: 'left',
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
  divider: {
    height: '1px',
    background: 'var(--border-color)',
    margin: '1rem 0',
  },
  statusButtonsGroup: {
    display: 'flex',
    flexDirection: 'column',
    marginTop: '0.5rem',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1.5rem',
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'center',
    fontSize: '0.9rem',
  },
  tr: {
    borderBottom: '1px solid var(--border-color)',
  },
  trHover: {
    borderBottom: '1px solid rgba(255,255,255,0.03)',
  },
  th: {
    padding: '0.75rem 1rem',
    color: 'var(--text-muted)',
    fontWeight: '600',
    textAlign: 'center',
  },
  td: {
    padding: '0.75rem 1rem',
    color: '#fff',
    textAlign: 'center',
  },
};

export default AdminDashboard;
