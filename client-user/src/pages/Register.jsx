import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { Lock, Mail, User, Phone, Sparkles, Eye, EyeOff } from 'lucide-react';

const Register = () => {
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'user',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { name, email, phone, role, password, confirmPassword } = formData;

  const handleChange = (e) => {
    if (e.target.name === 'phone') {
      const cleanVal = e.target.value.replace(/\D/g, '').slice(0, 10);
      setFormData({ ...formData, [e.target.name]: cleanVal });
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Front-end validations
    if (!name || !email || !phone || !password || !confirmPassword) {
      return toast.error('Please enter all fields');
    }

    if (phone.length !== 10) {
      return toast.error('Phone number must be exactly 10 digits');
    }

    if (password.length < 6) {
      return toast.error('Password must be at least 6 characters');
    }

    if (password !== confirmPassword) {
      return toast.error('Passwords do not match');
    }

    setLoading(true);
    const res = await register(name, email, password, phone, role);
    setLoading(false);

    if (res && res.success) {
      if (role !== 'user') {
        toast.success(res.message || 'Registration successful! Your admin account is pending Super Admin approval.');
        navigate('/login');
      } else {
        toast.success('Registration successful!');
        navigate('/map');
      }
    } else {
      toast.error(res?.message || 'Registration failed');
    }
  };

  return (
    <div className="page-wrapper" style={styles.container}>
      <div style={styles.card} className="glass-card animate-fade-in">
        <div style={styles.header}>
          <div style={styles.iconCircle}>
            <Sparkles size={28} color="var(--success)" />
          </div>
          <h2 style={styles.title}>Register Account</h2>
          <p style={styles.subtitle}>Set up details to get instant access to bookings</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div className="form-group">
            <label className="form-label" htmlFor="name">Full Name</label>
            <div style={styles.inputWrapper}>
              <User size={16} style={styles.inputIcon} />
              <input
                id="name"
                name="name"
                type="text"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                value={name}
                onChange={handleChange}
                placeholder="John Doe"
                required
              />
            </div>
          </div>

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
                placeholder="john@email.com"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="phone">Phone Number</label>
            <div style={styles.inputWrapper}>
              <Phone size={16} style={styles.inputIcon} />
              <input
                id="phone"
                name="phone"
                type="tel"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                value={phone}
                onChange={handleChange}
                placeholder="9876543210"
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
                placeholder="•••••• (min 6 characters)"
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
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirmPassword">Confirm Password</label>
            <div style={styles.inputWrapper}>
              <Lock size={16} style={styles.inputIcon} />
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                className="form-input"
                style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                value={confirmPassword}
                onChange={handleChange}
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
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            Already have an account?{' '}
            <Link to="/login" style={styles.link}>
              Log in instead
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(circle at 50% 50%, var(--secondary) 0%, var(--background) 100%)',
    minHeight: 'calc(100vh - 70px)',
  },
  card: {
    width: '100%',
    maxWidth: '440px',
    padding: '2.5rem',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '1.5rem',
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
    marginTop: '1.5rem',
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
};

export default Register;
