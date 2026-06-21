import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import { Calendar, Car, QrCode, Clock, Trash2, ArrowRight, Ban } from 'lucide-react';

const MyBookings = () => {
  const { user } = useContext(AuthContext);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [selectedQr, setSelectedQr] = useState(null); // For QR modal popup

  const fetchBookings = async () => {
    try {
      const res = await axios.get('/api/bookings/my');
      if (res.data.success) {
        setBookings(res.data.data || []);
      }
    } catch (err) {
      toast.error('Failed to load reservation bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [user]);

  const handleCancelBooking = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this reservation? Refund will be auto-processed.')) {
      return;
    }

    setCancellingId(id);
    try {
      const res = await axios.patch(`/api/bookings/${id}/cancel`);
      if (res.data.success) {
        toast.success(res.data.message || 'Booking cancelled successfully. Refund initiated.');
        // Refresh local bookings list
        fetchBookings();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cancellation request failed.');
    } finally {
      setCancellingId(null);
    }
  };

  const handleDeleteBooking = async (id) => {
    const booking = bookings.find((b) => b._id === id);
    const isActive = booking && booking.status === 'active';

    const confirmMsg = isActive
      ? 'WARNING: This reservation is currently ACTIVE. Deleting it will release your parking spot and remove it from your history. Are you sure you want to proceed?'
      : 'Are you sure you want to delete this booking from your history?';

    if (!window.confirm(confirmMsg)) {
      return;
    }

    try {
      const res = await axios.delete(`/api/bookings/${id}`);
      if (res.data.success) {
        toast.success('Booking deleted successfully.');
        fetchBookings();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete request failed.');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    const options = { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    };
    return date.toLocaleDateString('en-US', options);
  };

  const getStatusBadgeClass = (status, paymentStatus) => {
    if (status === 'cancelled') return 'badge badge-cancelled';
    if (paymentStatus === 'pending') return 'badge badge-pending';
    if (status === 'completed') return 'badge badge-completed';
    return 'badge badge-active'; // active & paid
  };

  return (
    <div className="page-wrapper container animate-fade-in">
      <div style={styles.header}>
        <h1 style={styles.title}>My Reservations</h1>
        <p style={styles.subtitle}>Manage your active bookings, view QR scanning tickets, and check history.</p>
      </div>

      {loading ? (
        <div style={styles.loadingWrapper}>
          <div className="skeleton" style={{ height: '150px', marginBottom: '1.5rem', borderRadius: '12px' }}></div>
          <div className="skeleton" style={{ height: '150px', marginBottom: '1.5rem', borderRadius: '12px' }}></div>
        </div>
      ) : bookings.length === 0 ? (
        <div style={styles.noBookings} className="glass-card">
          <Calendar size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
          <h3>No Parking Bookings Found</h3>
          <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0 1.5rem 0' }}>You haven't made any parking spot reservations yet.</p>
          <a href="/map" className="btn btn-success">View Live Map & Book</a>
        </div>
      ) : (
        <div style={styles.bookingsList}>
          {bookings.map((booking) => {
            const spot = booking.spotId || {};
            const isCancelable = booking.status === 'active';

            return (
              <div key={booking._id} style={styles.bookingCard} className="glass-card">
                <div style={styles.cardHeader}>
                  <div style={styles.vehicleInfo}>
                    <Car size={20} color="var(--success)" />
                    <span style={styles.vehicleNum}>{booking.vehicleNumber}</span>
                    <span className={getStatusBadgeClass(booking.status, booking.paymentStatus)}>
                      {booking.status === 'active' && booking.paymentStatus === 'paid' ? 'Confirmed' : booking.status}
                    </span>
                  </div>
                  <div style={styles.priceTag}>
                    ₹{booking.amount}
                  </div>
                </div>

                <div style={styles.cardBody}>
                  <div style={styles.detailsGrid}>
                    <div style={styles.detailCol}>
                      <span style={styles.label}>Location:</span>
                      <span style={styles.val}>Spot {spot.spotNumber} • {spot.floor} Floor</span>
                    </div>

                    <div style={styles.detailCol}>
                      <span style={styles.label}>Duration:</span>
                      <span style={styles.val}>{booking.duration} hr{booking.duration > 1 ? 's' : ''}</span>
                    </div>

                    <div style={{ ...styles.detailCol, gridColumn: 'span 2' }}>
                      <span style={styles.label}>Schedule Timeline:</span>
                      <div style={styles.timelineRow}>
                        <span style={styles.val}>{formatDate(booking.startTime)}</span>
                        <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
                        <span style={styles.val}>{formatDate(booking.endTime)}</span>
                      </div>
                    </div>
                  </div>

                  <div style={styles.actionsRow}>
                    {booking.status === 'active' && (
                      <button
                        onClick={() => setSelectedQr(booking)}
                        className="btn btn-outline"
                        style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                      >
                        <QrCode size={16} /> Scan QR Entry
                      </button>
                    )}

                    {/* Delete button shown for each booking */}
                    <button
                      onClick={() => handleDeleteBooking(booking._id)}
                      className="btn btn-outline"
                      style={{
                        padding: '0.5rem 1rem',
                        fontSize: '0.85rem',
                        color: 'var(--highlight)',
                        borderColor: 'rgba(233, 69, 96, 0.3)',
                        marginLeft: 'auto',
                      }}
                    >
                      <Trash2 size={16} /> Delete
                    </button>

                    {isCancelable ? (
                      <button
                        onClick={() => handleCancelBooking(booking._id)}
                        className="btn btn-highlight"
                        disabled={cancellingId === booking._id}
                        style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                      >
                        <Ban size={16} /> {cancellingId === booking._id ? 'Cancelling...' : 'Cancel Reservation'}
                      </button>
                    ) : booking.status === 'active' ? (
                      <span style={styles.lockMessage}>* Cancellation locked (starts within 30m)</span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* QR Code Ticket Modal */}
      {selectedQr && (
        <div style={styles.modalOverlay} onClick={() => setSelectedQr(null)}>
          <div style={styles.modalContent} className="glass-card" onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3>Entry Pass Ticket</h3>
              <button style={styles.closeBtn} onClick={() => setSelectedQr(null)}>×</button>
            </div>
            
            <div style={styles.qrWrapper}>
              <QRCodeSVG 
                value={selectedQr.qrCode || ''} 
                size={220}
                bgColor="#ffffff"
                fgColor="#0d0d0d"
                level="Q"
                includeMargin={true}
              />
            </div>

            <div style={styles.qrMeta}>
              <p style={{ fontWeight: 'bold', fontSize: '1.05rem', color: '#fff' }}>
                Vehicle: {selectedQr.vehicleNumber}
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                Spot: {selectedQr.spotId?.spotNumber} ({selectedQr.spotId?.floor} Floor)
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                Present this QR code at the automated gate scanner to check in and activate spot sensors.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  header: {
    marginBottom: '2.5rem',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '2rem',
  },
  subtitle: {
    color: 'var(--text-muted)',
    fontSize: '0.95rem',
  },
  loadingWrapper: {
    width: '100%',
  },
  noBookings: {
    padding: '4rem 2rem',
    textAlign: 'center',
    maxWidth: '500px',
    margin: '2rem auto 0 auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  bookingsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  bookingCard: {
    padding: '1.5rem 2rem',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '1rem',
    marginBottom: '1rem',
  },
  vehicleInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  vehicleNum: {
    fontFamily: 'var(--font-display)',
    fontWeight: '700',
    fontSize: '1.15rem',
  },
  priceTag: {
    fontSize: '1.2rem',
    fontWeight: '800',
    color: 'var(--success)',
    fontFamily: 'var(--font-display)',
  },
  cardBody: {
    width: '100%',
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1.25rem',
    marginBottom: '1.5rem',
  },
  detailCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    letterSpacing: '0.05em',
  },
  val: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: '#fff',
  },
  timelineRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  actionsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    borderTop: '1px solid var(--border-color)',
    paddingTop: '1rem',
  },
  lockMessage: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
    marginLeft: 'auto',
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
    alignItems: 'center',
    position: 'relative',
    textAlign: 'center',
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
  qrWrapper: {
    background: '#fff',
    padding: '1rem',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
    marginBottom: '1.5rem',
  },
  qrMeta: {
    width: '100%',
  },
};

export default MyBookings;
