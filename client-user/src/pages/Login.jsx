import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { Lock, Mail, KeyRound, CheckCircle2, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const { user, login, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetStep, setResetStep] = useState('email'); // 'email', 'otp', 'password', 'success'
  const [resetEmail, setResetEmail] = useState('');
  const [sendingReset, setSendingReset] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [dynamicOtp, setDynamicOtp] = useState('');

  useEffect(() => {
    if (user && user.role === 'user') {
      navigate('/map');
    }
  }, [user, navigate]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
      return toast.error('Please enter your email address');
    }
    setSendingReset(true);
    try {
      const res = await axios.post('/api/auth/forgot-password', { email: resetEmail });
      if (res.data.success) {
        setDynamicOtp(res.data.otp);
        setResetStep('otp');
        toast.success(`Verification code sent! Use OTP: ${res.data.otp}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send verification code');
    } finally {
      setSendingReset(false);
    }
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    if (otpCode !== dynamicOtp) {
      return toast.error(`Invalid verification code. Please use OTP: ${dynamicOtp}`);
    }
    setResetStep('password');
    toast.success('Code verified successfully!');
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      return toast.error('Password must be at least 6 characters long');
    }
    if (newPassword !== confirmNewPassword) {
      return toast.error('Passwords do not match');
    }
    setSendingReset(true);
    try {
      const res = await axios.post('/api/auth/reset-password', {
        email: resetEmail,
        otp: otpCode,
        newPassword
      });
      if (res.data.success) {
        setResetStep('success');
        toast.success('Password updated successfully!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setSendingReset(false);
    }
  };

  const handleCloseModal = () => {
    setShowForgotModal(false);
    setResetStep('email');
    setResetEmail('');
    setOtpCode('');
    setNewPassword('');
    setConfirmNewPassword('');
    setDynamicOtp('');
  };

  const { email, password } = formData;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      return toast.error('Please enter all fields');
    }

    setLoading(true);
    const res = await login(email, password);
    setLoading(false);

    if (res && res.success) {
      if (res.user && res.user.role !== 'user') {
        logout();
        if (res.user.role === 'superadmin') {
          toast.error('Access denied. Super Admin can login only on the Super Admin login page.');
        } else if (res.user.role === 'operationadmin') {
          toast.error('Access denied. Operations Admin can login only on the Operations login page.');
        } else {
          toast.error('Access denied. This portal is for customers only.');
        }
        return;
      }
      toast.success('Successfully logged in!');
      navigate('/map');
    } else {
      toast.error(res?.message || 'Login failed');
    }
  };

  return (
    <div className="page-wrapper" style={styles.container}>
      <div style={styles.card} className="glass-card animate-fade-in">
        <div style={styles.header}>
          <div style={styles.iconCircle}>
            <KeyRound size={28} color="var(--success)" />
          </div>
          <h2 style={styles.title}>Secure Login</h2>
          <p style={styles.subtitle}>Enter credentials to access your parking account</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <div style={styles.inputWrapper}>
              <Mail size={16} style={styles.inputIcon} />
              <input
                id="email"
                name="email"
                type="email"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                value={email}
                onChange={handleChange}
                placeholder="name@email.com"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <div style={styles.inputWrapper}>
              <Lock size={16} style={styles.inputIcon} />
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                value={password}
                onChange={handleChange}
                placeholder="••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.75rem' }}>
              <button 
                type="button" 
                onClick={() => setShowForgotModal(true)} 
                style={styles.forgotBtn}
              >
                Forgot Password?
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-success"
            style={{ width: '100%', marginTop: '1rem' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            Don't have an account?{' '}
            <Link to="/register" style={styles.link}>
              Create one now
            </Link>
          </p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div style={styles.modalOverlay} onClick={handleCloseModal}>
          <div style={styles.modalContent} className="glass-card animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Reset Password</h3>
              <button 
                style={styles.closeBtn} 
                onClick={handleCloseModal}
              >
                ×
              </button>
            </div>
            
            {resetStep === 'email' && (
              <form onSubmit={handleSendOtp} style={styles.modalBody}>
                <p style={styles.modalText}>
                  Enter your registered email address and we will send you a 6-digit OTP code to reset your password.
                </p>
                <div className="form-group" style={{ marginTop: '1.5rem', textAlign: 'left' }}>
                  <label className="form-label" htmlFor="resetEmail">Email Address</label>
                  <div style={styles.inputWrapper}>
                    <Mail size={16} style={styles.inputIcon} />
                    <input
                      id="resetEmail"
                      type="email"
                      className="form-input"
                      style={{ paddingLeft: '2.5rem' }}
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="name@email.com"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="btn btn-success"
                  style={{ width: '100%', marginTop: '1rem' }}
                  disabled={sendingReset}
                >
                  {sendingReset ? 'Sending Verification Code...' : 'Send Verification Code (OTP)'}
                </button>
              </form>
            )}

            {resetStep === 'otp' && (
              <form onSubmit={handleVerifyOtp} style={styles.modalBody}>
                <p style={styles.modalText}>
                  A 6-digit OTP has been sent to <strong>{resetEmail}</strong>. Enter the verification code to continue.
                </p>
                <p style={{ ...styles.modalText, fontSize: '0.8rem', color: '#FFC107', marginTop: '0.5rem' }}>
                  Mock Code: <strong>{dynamicOtp}</strong>
                </p>
                <div className="form-group" style={{ marginTop: '1rem', textAlign: 'left' }}>
                  <label className="form-label" htmlFor="otpCode">Verification Code</label>
                  <div style={styles.inputWrapper}>
                    <Lock size={16} style={styles.inputIcon} />
                    <input
                      id="otpCode"
                      type="text"
                      className="form-input"
                      style={{ paddingLeft: '2.5rem', letterSpacing: '0.3em', textAlign: 'center', fontWeight: 'bold' }}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="••••••"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="btn btn-success"
                  style={{ width: '100%', marginTop: '1rem' }}
                >
                  Verify Code
                </button>
                <button
                  type="button"
                  style={{ ...styles.forgotBtn, display: 'block', margin: '1rem auto 0 auto' }}
                  onClick={() => setResetStep('email')}
                >
                  Back
                </button>
              </form>
            )}

            {resetStep === 'password' && (
              <form onSubmit={handleResetPassword} style={styles.modalBody}>
                <p style={styles.modalText}>
                  Verification successful. Please enter and confirm your new password below.
                </p>
                <div className="form-group" style={{ marginTop: '1.5rem', textAlign: 'left' }}>
                  <label className="form-label" htmlFor="newPassword">New Password</label>
                  <div style={styles.inputWrapper}>
                    <Lock size={16} style={styles.inputIcon} />
                    <input
                      id="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      className="form-input"
                      style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      style={styles.eyeButton}
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="form-group" style={{ textAlign: 'left' }}>
                  <label className="form-label" htmlFor="confirmNewPassword">Confirm New Password</label>
                  <div style={styles.inputWrapper}>
                    <Lock size={16} style={styles.inputIcon} />
                    <input
                      id="confirmNewPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      className="form-input"
                      style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={styles.eyeButton}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  className="btn btn-success"
                  style={{ width: '100%', marginTop: '1rem' }}
                  disabled={sendingReset}
                >
                  {sendingReset ? 'Updating Password...' : 'Update Password'}
                </button>
              </form>
            )}

            {resetStep === 'success' && (
              <div style={styles.modalBody}>
                <div style={styles.successIconBox}>
                  <CheckCircle2 size={32} color="var(--success)" />
                </div>
                <h4 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: '700', marginTop: '1rem', marginBottom: '0.5rem' }}>
                  Password Reset Complete!
                </h4>
                <p style={{ ...styles.modalText, textAlign: 'center' }}>
                  Your password has been successfully updated. You can now use your new credentials to log in.
                </p>
                <button
                  onClick={handleCloseModal}
                  className="btn btn-success"
                  style={{ width: '100%', marginTop: '1.5rem' }}
                >
                  Back to Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  forgotBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--success)',
    fontSize: '0.8rem',
    fontWeight: '500',
    cursor: 'pointer',
    padding: 0,
    textDecoration: 'none',
    fontFamily: 'var(--font-body)',
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
    borderRadius: '12px',
    border: '1px solid var(--border-color)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    marginBottom: '1rem',
    fontFamily: 'var(--font-display)',
  },
  modalTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#fff',
    margin: 0,
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
    textAlign: 'center',
  },
  modalText: {
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
    lineHeight: '1.5',
    margin: 0,
  },
  successIconBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    background: 'rgba(0, 180, 216, 0.1)',
    margin: '1rem auto 0 auto',
    border: '1px solid rgba(0, 180, 216, 0.2)',
  },
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(circle at 50% 50%, var(--secondary) 0%, var(--background) 100%)',
    minHeight: 'calc(100vh - 70px)',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    padding: '2.5rem',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '2rem',
    textAlign: 'center',
  },
  iconCircle: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    background: 'rgba(0, 180, 216, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1rem',
    border: '1px solid rgba(0, 180, 216, 0.2)',
  },
  title: {
    fontSize: '1.6rem',
    fontFamily: 'var(--font-display)',
  },
  subtitle: {
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
    marginTop: '0.25rem',
  },
  form: {
    width: '100%',
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
  eyeButton: {
    position: 'absolute',
    right: '12px',
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  footer: {
    marginTop: '2rem',
    textAlign: 'center',
  },
  footerText: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
  },
  link: {
    color: 'var(--success)',
    textDecoration: 'none',
    fontWeight: '600',
  },
  demoCredentials: {
    marginTop: '1.5rem',
    padding: '0.75rem',
    background: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    textAlign: 'left',
  },
  demoTitle: {
    fontSize: '0.8rem',
    color: '#fff',
    marginBottom: '0.25rem',
  },
  demoText: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    margin: '2px 0',
  },
};

export default Login;
