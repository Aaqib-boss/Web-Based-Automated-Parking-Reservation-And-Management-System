import React, { useState, useEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { Calendar, Clock, CreditCard, ShieldAlert } from 'lucide-react';

const BookingPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  // Retrieve spot info from navigation state
  const spotData = location.state || {};
  const { spotId, spotNumber, floor, branch } = spotData;

  const [vehicleNumber, setVehicleNumber] = useState('');
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState(1); // 1, 2, 4, 24
  const [rates, setRates] = useState({ baseRate: 30, twoHourRate: 50, fourHourRate: 90, fullDayRate: 150 });
  const [price, setPrice] = useState(30);
  const [loading, setLoading] = useState(false);

  // Mock Payment States
  const [showMockCardModal, setShowMockCardModal] = useState(false);
  const [mockCardForm, setMockCardForm] = useState({ name: '', number: '', expiry: '', cvv: '' });
  const [processingSimulatedPayment, setProcessingSimulatedPayment] = useState(false);
  const [pendingBookingId, setPendingBookingId] = useState('');
  const [pendingOrderId, setPendingOrderId] = useState('');

  useEffect(() => {
    // If no spot is selected, redirect to map
    if (!spotId) {
      toast.error('Please select a parking spot first');
      navigate('/map');
    }

    // Set default start time to current time formatted for input
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setStartTime(now.toISOString().slice(0, 16));

    // Fetch pricing rates from backend
    const fetchRates = async () => {
      try {
        const res = await axios.get(`/api/pricing?branch=${encodeURIComponent(branch || 'Negombo')}`);
        if (res.data.success) {
          setRates(res.data.data);
          setPrice(res.data.data.baseRate);
        }
      } catch (err) {
        console.error('Error fetching pricing rates:', err.message);
      }
    };
    fetchRates();
  }, [spotId]);

  // Recalculate price when duration changes
  useEffect(() => {
    if (duration === 1) setPrice(rates.baseRate);
    else if (duration === 2) setPrice(rates.twoHourRate);
    else if (duration === 4) setPrice(rates.fourHourRate);
    else if (duration === 24) setPrice(rates.fullDayRate);
  }, [duration, rates]);

  const handleDurationClick = (val) => {
    setDuration(val);
  };

  const handleSubmitMockPayment = async (e) => {
    e.preventDefault();
    if (mockCardForm.number.replace(/\s/g, '').length !== 16) {
      return toast.error('Please enter a valid 16-digit card number.');
    }
    if (mockCardForm.expiry.length !== 5) {
      return toast.error('Please enter a valid expiry date (MM/YY).');
    }
    if (mockCardForm.cvv.length !== 3) {
      return toast.error('Please enter a valid 3-digit CVV.');
    }

    setProcessingSimulatedPayment(true);
    toast.loading('Processing simulated transaction...', { id: 'payment' });

    // Wait 1.5 seconds for premium authorize effect
    setTimeout(async () => {
      try {
        const verifyRes = await axios.post('/api/payments/verify', {
          bookingId: pendingBookingId,
          razorpayOrderId: pendingOrderId,
          razorpayPaymentId: `pay_mock_${Math.random().toString(36).substr(2, 9)}`,
          razorpaySignature: 'mock_signature',
        });

        toast.dismiss('payment');
        if (verifyRes.data.success) {
          toast.success('Payment completed & reservation confirmed!');
          setShowMockCardModal(false);
          navigate('/bookings');
        } else {
          toast.error('Simulation verification failed.');
        }
      } catch (err) {
        toast.dismiss('payment');
        toast.error(err.response?.data?.message || 'Payment simulation verification error.');
      } finally {
        setProcessingSimulatedPayment(false);
      }
    }, 1500);
  };

  const handleCancelMockPayment = () => {
    setShowMockCardModal(false);
    toast.error('Payment cancelled by user.');
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!vehicleNumber.trim()) {
      return toast.error('Please enter your vehicle number');
    }

    setLoading(true);

    try {
      // 1. Create booking (returns booking object with status active, payment pending)
      const bookingRes = await axios.post('/api/bookings', {
        spotId,
        vehicleNumber,
        startTime: new Date(startTime),
        duration,
      });

      if (!bookingRes.data.success) {
        setLoading(false);
        return toast.error('Booking failed. Spot may have been taken.');
      }

      const booking = bookingRes.data.data;

      // 2. Create payment order (Razorpay or Simulation)
      const paymentRes = await axios.post('/api/payments/create', {
        bookingId: booking._id,
      });

      if (!paymentRes.data.success) {
        setLoading(false);
        return toast.error('Order creation failed.');
      }

      const { order, isSimulated, keyId } = paymentRes.data;

      if (isSimulated) {
        setPendingBookingId(booking._id);
        setPendingOrderId(order.id);
        setShowMockCardModal(true);
        setLoading(false);
      } else {
        // STANDARD RAZORPAY FLOW
        const loadRazorpaySDK = () => {
          return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
          });
        };

        const sdkLoaded = await loadRazorpaySDK();
        if (!sdkLoaded) {
          setLoading(false);
          return toast.error('Razorpay SDK failed to load. Are you offline?');
        }

        const options = {
          key: keyId,
          amount: order.amount,
          currency: order.currency,
          name: 'ParkSmart Reservator',
          description: `Spot ${spotNumber} Reservation`,
          order_id: order.id,
          handler: async (response) => {
            try {
              toast.loading('Verifying transaction...', { id: 'payment' });
              const verifyRes = await axios.post('/api/payments/verify', {
                bookingId: booking._id,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              });

              toast.dismiss('payment');
              if (verifyRes.data.success) {
                toast.success('Payment completed & reservation confirmed!');
                navigate('/bookings');
              } else {
                toast.error('Signature verification failed.');
              }
            } catch (err) {
              toast.dismiss('payment');
              toast.error('Payment verification failed.');
            } finally {
              setLoading(false);
            }
          },
          prefill: {
            name: user.name,
            email: user.email,
            contact: user.phone || '9999999999',
          },
          theme: {
            color: '#0F3460',
          },
          modal: {
            ondismiss: () => {
              setLoading(false);
              toast.error('Payment cancelled by user.');
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      }
    } catch (err) {
      setLoading(false);
      toast.error(err.response?.data?.message || 'Error occurred during checkout process.');
    }
  };

  return (
    <div className="page-wrapper container animate-fade-in" style={styles.page}>
      <div className="booking-layout-grid" style={styles.gridContainer}>
        {/* Reservation form */}
        <div style={styles.formCard} className="glass-card">
          <h2 style={styles.formTitle}>Book Parking Spot</h2>
          <p style={styles.formSubtitle}>Verify details and confirm your checkout order.</p>
          <div style={styles.divider}></div>

          <form onSubmit={handleCheckout}>
            <div className="form-group">
              <label className="form-label" htmlFor="vehicle">Vehicle Registration Number</label>
              <input
                id="vehicle"
                type="text"
                className="form-input"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                placeholder="e.g. KA03MJ1234"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="startTime">Parking Starts At</label>
              <div style={styles.inputWrapper}>
                <Calendar size={16} style={styles.inputIcon} />
                <input
                  id="startTime"
                  type="datetime-local"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Parking Duration</label>
              <div style={styles.durationSelector}>
                {[
                  { value: 1, label: '1 Hour' },
                  { value: 2, label: '2 Hours' },
                  { value: 4, label: '4 Hours' },
                  { value: 24, label: 'Full Day' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleDurationClick(opt.value)}
                    style={duration === opt.value ? styles.activeDurationBtn : styles.durationBtn}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-success"
              style={{ width: '100%', marginTop: '1.5rem' }}
              disabled={loading}
            >
              <CreditCard size={18} />
              {loading ? 'Processing Transaction...' : `Pay & Reserve (₹${price})`}
            </button>
          </form>
        </div>

        {/* Spot Summary Billing Sidebar */}
        <div style={styles.sidebarPanel} className="glass-card">
          <h3 style={styles.sidebarTitle}>Order Summary</h3>
          <div style={styles.divider}></div>

          <div style={styles.summaryRow}>
            <span style={styles.summaryLabel}>Selected Space:</span>
            <span style={styles.summaryVal}>Spot {spotNumber}</span>
          </div>

          <div style={styles.summaryRow}>
            <span style={styles.summaryLabel}>Branch:</span>
            <span style={styles.summaryVal}>{branch || 'Negombo'}</span>
          </div>

          <div style={styles.summaryRow}>
            <span style={styles.summaryLabel}>Floor Level:</span>
            <span style={styles.summaryVal}>{floor} Floor</span>
          </div>

          <div style={styles.summaryRow}>
            <span style={styles.summaryLabel}>Base Rate:</span>
            <span style={styles.summaryVal}>₹{rates.baseRate} / hour</span>
          </div>

          <div style={styles.divider}></div>

          <div style={styles.pricingBreakdown}>
            <div style={styles.summaryRow}>
              <span>Subtotal:</span>
              <span>₹{price}</span>
            </div>
            <div style={styles.summaryRow}>
              <span>Tax (GST 0%):</span>
              <span>₹0</span>
            </div>
            <div style={{ ...styles.summaryRow, fontSize: '1.2rem', fontWeight: '800', marginTop: '0.5rem' }}>
              <span>Total Amount:</span>
              <span style={{ color: 'var(--success)' }}>₹{price}</span>
            </div>
          </div>

          <div style={styles.policyCard}>
            <ShieldAlert size={18} color="var(--highlight)" style={{ flexShrink: 0 }} />
            <p style={styles.policyText}>
              <strong>Cancellation Policy:</strong> Free cancellation up to 30 minutes before booking start time. Refund will be auto-processed to the source payment method.
            </p>
          </div>
        </div>
      </div>

      {/* Mock Payment Card Modal */}
      {showMockCardModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent} className="glass-card animate-fade-in">
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Complete Payment</h3>
              <button onClick={handleCancelMockPayment} style={styles.closeBtn}>&times;</button>
            </div>
            
            <div style={styles.modalBody}>
              {/* Dynamic Virtual Card Preview */}
              <div style={styles.virtualCard}>
                <div style={styles.cardHeader}>
                  <CreditCard size={32} color="#fff" />
                  <span style={styles.cardType}>SIMULATED CARD</span>
                </div>
                <div style={styles.cardNumberDisplay}>
                  {mockCardForm.number || '•••• •••• •••• ••••'}
                </div>
                <div style={styles.cardRow}>
                  <div>
                    <div style={styles.cardLabel}>CARDHOLDER</div>
                    <div style={styles.cardVal}>{mockCardForm.name || 'YOUR NAME'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '1.5rem' }}>
                    <div>
                      <div style={styles.cardLabel}>EXPIRES</div>
                      <div style={styles.cardVal}>{mockCardForm.expiry || 'MM/YY'}</div>
                    </div>
                    <div>
                      <div style={styles.cardLabel}>CVV</div>
                      <div style={styles.cardVal}>{mockCardForm.cvv ? '•••' : '•••'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Inputs */}
              <form onSubmit={handleSubmitMockPayment} style={styles.modalForm}>
                <div className="form-group" style={{ marginBottom: '1.2rem' }}>
                  <label className="form-label">Card Number</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="4111 2222 3333 4444"
                    maxLength="19"
                    value={mockCardForm.number}
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, '');
                      let formatted = '';
                      for (let i = 0; i < val.length && i < 16; i++) {
                        if (i > 0 && i % 4 === 0) formatted += ' ';
                        formatted += val[i];
                      }
                      setMockCardForm({ ...mockCardForm, number: formatted });
                    }}
                    style={{ width: '100%' }}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '1.2rem' }}>
                  <label className="form-label">Cardholder Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="JOHN DOE"
                    value={mockCardForm.name}
                    onChange={(e) => setMockCardForm({ ...mockCardForm, name: e.target.value.toUpperCase() })}
                    style={{ width: '100%' }}
                    required
                  />
                </div>

                <div style={styles.formRow}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Expiry Date</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="MM/YY"
                      maxLength="5"
                      value={mockCardForm.expiry}
                      onChange={(e) => {
                        let cleanVal = e.target.value.replace(/\D/g, '');
                        
                        if (cleanVal.length === 1) {
                          if (cleanVal !== '0' && cleanVal !== '1') {
                            cleanVal = '0' + cleanVal;
                          }
                        } else if (cleanVal.length >= 2) {
                          let month = parseInt(cleanVal.slice(0, 2), 10);
                          if (month < 1) month = 1;
                          if (month > 12) month = 12;
                          const monthStr = month.toString().padStart(2, '0');
                          cleanVal = monthStr + cleanVal.slice(2);
                        }

                        let formatted = cleanVal;
                        if (cleanVal.length > 2) {
                          formatted = cleanVal.slice(0, 2) + '/' + cleanVal.slice(2, 4);
                        }
                        setMockCardForm({ ...mockCardForm, expiry: formatted });
                      }}
                      style={{ width: '100%' }}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">CVV</label>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="123"
                      maxLength="3"
                      value={mockCardForm.cvv}
                      onChange={(e) => setMockCardForm({ ...mockCardForm, cvv: e.target.value.replace(/\D/g, '') })}
                      style={{ width: '100%' }}
                      required
                    />
                  </div>
                </div>

                <div style={styles.actionBtns}>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleCancelMockPayment}
                    style={{ flex: 1 }}
                    disabled={processingSimulatedPayment}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-success"
                    style={{ flex: 2 }}
                    disabled={processingSimulatedPayment}
                  >
                    {processingSimulatedPayment ? 'Verifying...' : `Pay ₹${price}`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  page: {
    paddingTop: '3rem',
  },
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '2.5rem',
  },
  formCard: {
    padding: '2.5rem',
  },
  formTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.8rem',
  },
  formSubtitle: {
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
    marginBottom: '1rem',
  },
  divider: {
    height: '1px',
    background: 'var(--border-color)',
    margin: '1.5rem 0',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '12px',
    color: 'var(--text-muted)',
  },
  durationSelector: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.75rem',
    '@media (min-width: 576px)': {
      gridTemplateColumns: 'repeat(4, 1fr)',
    },
  },
  durationBtn: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-muted)',
    padding: '0.75rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    fontWeight: '500',
    fontSize: '0.85rem',
    transition: 'all 0.2s',
  },
  activeDurationBtn: {
    background: 'var(--accent)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff',
    padding: '0.75rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    fontWeight: '600',
    fontSize: '0.85rem',
  },
  sidebarPanel: {
    padding: '2.5rem',
    height: 'fit-content',
  },
  sidebarTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.3rem',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    margin: '0.75rem 0',
    fontSize: '0.95rem',
  },
  summaryLabel: {
    color: 'var(--text-muted)',
  },
  summaryVal: {
    color: '#fff',
    fontWeight: '600',
  },
  pricingBreakdown: {
    background: 'rgba(0,0,0,0.2)',
    padding: '1rem',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
  },
  policyCard: {
    display: 'flex',
    gap: '0.75rem',
    background: 'rgba(233, 69, 96, 0.05)',
    border: '1px solid rgba(233, 69, 96, 0.2)',
    borderRadius: '8px',
    padding: '1rem',
    marginTop: '2rem',
  },
  policyText: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    lineHeight: '1.4',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    width: '90%',
    maxWidth: '440px',
    background: '#1a1a2e',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    padding: '2rem',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
    position: 'relative',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
  },
  modalTitle: {
    fontSize: '1.4rem',
    fontFamily: 'var(--font-display)',
    color: '#fff',
    margin: 0,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: '1.8rem',
    cursor: 'pointer',
    transition: 'color 0.2s',
    lineHeight: 1,
  },
  modalBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  virtualCard: {
    background: 'linear-gradient(135deg, #0f3460 0%, #16213e 100%)',
    borderRadius: '12px',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    height: '190px',
    boxShadow: 'inset 0 0 10px rgba(255, 255, 255, 0.1), 0 8px 20px rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardType: {
    fontSize: '0.75rem',
    color: 'rgba(255,255,255,0.7)',
    fontWeight: 'bold',
    letterSpacing: '1px',
  },
  cardNumberDisplay: {
    fontSize: '1.3rem',
    color: '#fff',
    letterSpacing: '3px',
    fontFamily: 'monospace',
    margin: '1.2rem 0',
    textAlign: 'center',
  },
  cardRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: '0.6rem',
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: '0.1rem',
    letterSpacing: '1px',
  },
  cardVal: {
    fontSize: '0.8rem',
    color: '#fff',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
  },
  formRow: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  actionBtns: {
    display: 'flex',
    gap: '1rem',
    marginTop: '0.5rem',
  },
}

// CSS media query overrides
const injectBookingLayout = () => {
  const style = document.createElement('style');
  style.innerHTML = `
    @media (min-width: 992px) {
      .container {
        max-width: 1100px;
      }
      .booking-layout-grid {
        grid-template-columns: 1.1fr 0.9fr !important;
      }
    }
  `;
  document.head.appendChild(style);
};
if (typeof document !== 'undefined') injectBookingLayout();

export default BookingPage;
