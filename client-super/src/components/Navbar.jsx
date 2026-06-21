import React, { useContext, useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { 
  Shield, LayoutDashboard, LogOut, User, Menu, X, 
  ChevronDown, Camera, Mail, Phone, MapPin, Trash2,
  Users, Settings, Eye, EyeOff, Calendar, DollarSign
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const Navbar = () => {
  const { user, logout, loadUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    email: '',
    phone: '',
    city: ''
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Password Change State
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [savingPassword, setSavingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileMenuOpen(false);
    setDropdownOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  const toggleDropdown = (e) => {
    e.stopPropagation();
    setDropdownOpen(!dropdownOpen);
  };

  // Close dropdown on click outside
  useEffect(() => {
    if (!dropdownOpen) return;
    const closeDropdown = () => setDropdownOpen(false);
    document.addEventListener('click', closeDropdown);
    return () => document.removeEventListener('click', closeDropdown);
  }, [dropdownOpen]);

  // Sync profile form details when modal opens
  useEffect(() => {
    if (profileModalOpen && user) {
      setProfileForm({
        email: user.email || '',
        phone: user.phone || '',
        city: user.city || 'Negombo'
      });
      setIsEditingProfile(false);
      setIsChangingPassword(false);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    }
  }, [profileModalOpen, user]);

  const handleAvatarUploadClick = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // Check file size (limit to 1.5MB for Base64 storage)
      if (file.size > 1.5 * 1024 * 1024) {
        return toast.error('Image is too large. Please select an image under 1.5MB.');
      }

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result;
        try {
          const res = await axios.put('/api/auth/profile/avatar', { avatar: base64String });
          if (res.data.success) {
            toast.success('Profile picture updated successfully!');
            await loadUser(); // Refresh the context user details
          }
        } catch (err) {
          toast.error(err.response?.data?.message || 'Failed to upload profile picture');
        }
      };
      reader.readAsDataURL(file);
    };
    fileInput.click();
  };

  const handleAvatarDelete = async () => {
    try {
      const res = await axios.delete('/api/auth/profile/avatar');
      if (res.data.success) {
        toast.success('Profile picture removed successfully!');
        await loadUser(); // Refresh the context user details
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove profile picture');
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (profileForm.phone.length !== 10) {
      return toast.error('Contact number must be exactly 10 digits.');
    }
    setSavingProfile(true);
    try {
      const res = await axios.put('/api/auth/profile', profileForm);
      if (res.data.success) {
        toast.success('Profile updated successfully!');
        await loadUser(); // Refresh the context user details
        setIsEditingProfile(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile details');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword.length < 6) {
      return toast.error('New password must be at least 6 characters.');
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return toast.error('Passwords do not match.');
    }
    setSavingPassword(true);
    try {
      const res = await axios.put('/api/auth/profile/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      if (res.data.success) {
        toast.success('Password updated successfully!');
        setIsChangingPassword(false);
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setShowCurrentPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update password');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <nav style={styles.nav}>
      <div style={styles.container}>
        {/* Logo */}
        <Link to="/" style={styles.logo} onClick={() => setMobileMenuOpen(false)}>
          <Shield size={28} color="var(--highlight)" />
          <span style={styles.logoText}>Park<span style={{ color: 'var(--highlight)' }}>Smart Super</span></span>
        </Link>
 
        {/* Desktop Center Links */}
        <div className="nav-center" style={styles.navCenter}>
          {user && (
            <>
              <Link to="/dashboard" style={isActive('/dashboard') ? styles.activeLink : styles.link}>
                <LayoutDashboard size={16} style={{ marginRight: 4 }} /> Dashboard
              </Link>
              <Link to="/dashboard/bookings" style={isActive('/dashboard/bookings') ? styles.activeLink : styles.link}>
                <Calendar size={16} style={{ marginRight: 4 }} /> User Booking
              </Link>
              <Link to="/dashboard/rates" style={isActive('/dashboard/rates') ? styles.activeLink : styles.link}>
                <DollarSign size={16} style={{ marginRight: 4 }} /> Parking Rates
              </Link>
              <Link to="/dashboard/users" style={isActive('/dashboard/users') ? styles.activeLink : styles.link}>
                <Users size={16} style={{ marginRight: 4 }} /> User Directory
              </Link>
              <Link to="/dashboard/settings" style={isActive('/dashboard/settings') ? styles.activeLink : styles.link}>
                <Settings size={16} style={{ marginRight: 4 }} /> Settings
              </Link>
            </>
          )}
        </div>

        {/* Desktop Right Links */}
        <div className="nav-right" style={styles.navRight}>
          {user ? (
            <div style={{ position: 'relative' }}>
              <button onClick={toggleDropdown} style={styles.dropdownTrigger}>
                <div style={styles.avatarMini}>
                  {user.avatar ? (
                    <img src={user.avatar} alt="Profile Mini" style={styles.avatarImg} />
                  ) : (
                    user.name ? user.name[0].toUpperCase() : 'S'
                  )}
                </div>
                <span style={styles.triggerName}>
                  {user.name}
                </span>
                <ChevronDown size={14} style={{ marginLeft: 4, color: 'var(--text-muted)' }} />
              </button>

              {dropdownOpen && (
                <div style={styles.dropdownMenu} className="glass-card" onClick={(e) => e.stopPropagation()}>
                  <div style={styles.dropdownHeader}>
                    <span style={styles.signedInLabel}>SIGNED IN AS</span>
                    <span style={styles.userEmail}>{user.email}</span>
                    <span style={styles.roleBadge}>{user.role === 'superadmin' ? 'SUPER ADMIN' : user.role.toUpperCase()}</span>
                  </div>
                  
                  <div style={styles.dropdownDivider}></div>
                  
                  <button 
                    onClick={() => { setDropdownOpen(false); setProfileModalOpen(true); }} 
                    style={styles.dropdownItem}
                    className="dropdown-menu-item"
                  >
                    <User size={16} style={{ marginRight: 8, color: 'var(--success)' }} />
                    My Profile & Admin
                  </button>
                  
                  <button 
                    onClick={handleLogout} 
                    style={{ ...styles.dropdownItem, color: '#E94560' }}
                    className="dropdown-menu-item"
                  >
                    <LogOut size={16} style={{ marginRight: 8, color: '#E94560' }} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={styles.authButtons}>
              <Link to="/" className="btn btn-outline" style={{ padding: '0.5rem 1rem' }}>Login</Link>
            </div>
          )}
        </div>

        {/* Mobile Toggle */}
        <button className="mobile-toggle-btn" style={styles.mobileToggle} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="mobile-menu" style={styles.mobileMenu}>
          {user ? (
            <>
              <Link to="/dashboard" style={styles.mobileNavLink(isActive('/dashboard'))} onClick={() => setMobileMenuOpen(false)}>
                Dashboard
              </Link>
              <Link to="/dashboard/bookings" style={styles.mobileNavLink(isActive('/dashboard/bookings'))} onClick={() => setMobileMenuOpen(false)}>
                User Booking
              </Link>
              <Link to="/dashboard/rates" style={styles.mobileNavLink(isActive('/dashboard/rates'))} onClick={() => setMobileMenuOpen(false)}>
                Parking Rates
              </Link>
              <Link to="/dashboard/users" style={styles.mobileNavLink(isActive('/dashboard/users'))} onClick={() => setMobileMenuOpen(false)}>
                User Directory
              </Link>
              <Link to="/dashboard/settings" style={styles.mobileNavLink(isActive('/dashboard/settings'))} onClick={() => setMobileMenuOpen(false)}>
                Settings
              </Link>
              <div style={styles.mobileUserSection}>
                <span style={styles.mobileUserName}>Hi, {user.name}</span>
                <button onClick={() => { setMobileMenuOpen(false); setProfileModalOpen(true); }} className="btn btn-outline" style={{ width: '100%', marginTop: '1rem' }}>
                  <User size={16} style={{ marginRight: 8 }} /> My Profile
                </button>
                <button onClick={handleLogout} className="btn btn-highlight" style={{ width: '100%', marginTop: '0.5rem' }}>
                  <LogOut size={16} style={{ marginRight: 8 }} /> Log Out
                </button>
              </div>
            </>
          ) : (
            <div style={styles.mobileAuthButtons}>
              <Link to="/" className="btn btn-outline" style={{ width: '100%' }} onClick={() => setMobileMenuOpen(false)}>Login</Link>
            </div>
          )}
        </div>
      )}

      {/* User Profile Modal */}
      {profileModalOpen && (
        <div style={styles.modalOverlay} onClick={() => setProfileModalOpen(false)}>
          <div style={styles.modalContent} className="glass-card" onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}>My Profile</h3>
              <button style={styles.closeBtn} onClick={() => setProfileModalOpen(false)}>×</button>
            </div>
            
            <div style={styles.modalBody}>
              {/* Avatar Circle with Camera & Trash Buttons */}
              <div style={styles.avatarContainer}>
                <div style={styles.avatarLarge}>
                  {user.avatar ? (
                    <img src={user.avatar} alt="Profile" style={styles.avatarImg} />
                  ) : (
                    user.name ? user.name[0].toUpperCase() : 'S'
                  )}
                  
                  <button style={styles.cameraBtn} title="Upload Avatar" onClick={handleAvatarUploadClick}>
                    <Camera size={14} color="#fff" />
                  </button>

                  {user.avatar && (
                    <button style={styles.trashBtn} title="Remove Avatar" onClick={handleAvatarDelete}>
                      <Trash2 size={14} color="#fff" />
                    </button>
                  )}
                </div>
              </div>

              {/* User Name and Role */}
              <div style={styles.profileMeta}>
                <h3 style={styles.profileName}>{user.name}</h3>
                <span style={styles.profileRoleBadge}>
                  {user.role === 'superadmin' ? 'SUPER ADMIN' : user.role.toUpperCase()}
                </span>
              </div>

              <div style={styles.profileDivider}></div>

              {isChangingPassword ? (
                <form onSubmit={handleSavePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group" style={{ margin: 0, textAlign: 'left' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>Current Password</label>
                    <div style={styles.inputWrapper}>
                      <input 
                        type={showCurrentPassword ? "text" : "password"} 
                        className="form-input" 
                        style={{ padding: '0.6rem 2.5rem 0.6rem 0.8rem', fontSize: '0.9rem', width: '100%' }}
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                        placeholder="Enter current password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        style={styles.eyeButton}
                        aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                      >
                        {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="form-group" style={{ margin: 0, textAlign: 'left' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>New Password</label>
                    <div style={styles.inputWrapper}>
                      <input 
                        type={showNewPassword ? "text" : "password"} 
                        className="form-input" 
                        style={{ padding: '0.6rem 2.5rem 0.6rem 0.8rem', fontSize: '0.9rem', width: '100%' }}
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        placeholder="Min 6 characters"
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

                  <div className="form-group" style={{ margin: 0, textAlign: 'left' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>Confirm New Password</label>
                    <div style={styles.inputWrapper}>
                      <input 
                        type={showConfirmPassword ? "text" : "password"} 
                        className="form-input" 
                        style={{ padding: '0.6rem 2.5rem 0.6rem 0.8rem', fontSize: '0.9rem', width: '100%' }}
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        placeholder="Confirm new password"
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

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '0.6rem', fontSize: '0.88rem' }} disabled={savingPassword}>
                      {savingPassword ? 'Updating...' : 'Update Password'}
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-outline" 
                      style={{ flex: 1, padding: '0.6rem', fontSize: '0.88rem' }} 
                      onClick={() => {
                        setIsChangingPassword(false);
                        setShowCurrentPassword(false);
                        setShowNewPassword(false);
                        setShowConfirmPassword(false);
                      }} 
                      disabled={savingPassword}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : isEditingProfile ? (
                <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group" style={{ margin: 0, textAlign: 'left' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>Email Address</label>
                    <input 
                      type="email" 
                      className="form-input" 
                      style={{ padding: '0.6rem 0.8rem', fontSize: '0.9rem' }}
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="form-group" style={{ margin: 0, textAlign: 'left' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>Contact Number</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      style={{ padding: '0.6rem 0.8rem', fontSize: '0.9rem' }}
                      value={profileForm.phone}
                      onChange={(e) => {
                        const cleanVal = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setProfileForm({ ...profileForm, phone: cleanVal });
                      }}
                      placeholder="Enter 10-digit number"
                      required
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0, textAlign: 'left' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>City</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      style={{ padding: '0.6rem 0.8rem', fontSize: '0.9rem' }}
                      value={profileForm.city}
                      onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                      required
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '0.6rem', fontSize: '0.88rem' }} disabled={savingProfile}>
                      {savingProfile ? 'Saving...' : 'Save'}
                    </button>
                    <button type="button" className="btn btn-outline" style={{ flex: 1, padding: '0.6rem', fontSize: '0.88rem' }} onClick={() => setIsEditingProfile(false)} disabled={savingProfile}>
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  {/* Info Details */}
                  <div style={styles.profileDetails}>
                    <div style={styles.infoRow}>
                      <Mail size={18} style={styles.infoIcon} />
                      <span style={styles.infoText}>{user.email}</span>
                    </div>
                    <div style={styles.infoRow}>
                      <Phone size={18} style={styles.infoIcon} />
                      <span style={styles.infoText}>{user.phone || 'No phone number'}</span>
                    </div>
                    <div style={styles.infoRow}>
                      <MapPin size={18} style={styles.infoIcon} />
                      <span style={styles.infoText}>{user.city || 'Negombo'}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button 
                      onClick={() => setIsEditingProfile(true)} 
                      className="btn btn-outline"
                      style={{ width: '100%', padding: '0.6rem', fontSize: '0.88rem', fontWeight: '600' }}
                    >
                      Edit Profile
                    </button>
                    <button 
                      onClick={() => setIsChangingPassword(true)} 
                      className="btn btn-outline"
                      style={{ width: '100%', padding: '0.6rem', fontSize: '0.88rem', fontWeight: '600', borderColor: 'var(--highlight)', color: 'var(--highlight)' }}
                    >
                      Change Password
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

const styles = {
  nav: {
    height: '70px',
    background: 'rgba(13, 13, 13, 0.8)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid var(--border-color)',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
  },
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '100%',
    width: '100%',
    padding: '0 2rem',
    position: 'relative',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    textDecoration: 'none',
  },
  logoText: {
    fontFamily: 'var(--font-display)',
    fontWeight: '800',
    fontSize: '1.4rem',
    color: '#fff',
  },
  navCenter: {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'none',
    alignItems: 'center',
    gap: '1.5rem',
  },
  navRight: {
    display: 'none',
    alignItems: 'center',
    gap: '1.5rem',
  },
  link: {
    color: 'var(--text-muted)',
    textDecoration: 'none',
    fontSize: '0.95rem',
    fontWeight: '500',
    transition: 'color 0.2s',
  },
  activeLink: {
    color: '#fff',
    textDecoration: 'none',
    fontSize: '0.95rem',
    fontWeight: '600',
    borderBottom: '2px solid var(--highlight)',
    paddingBottom: '4px',
  },
  dropdownTrigger: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '0.4rem 0.8rem',
    cursor: 'pointer',
    color: '#fff',
    transition: 'all 0.2s',
    outline: 'none',
  },
  avatarMini: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: 'var(--success)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '0.95rem',
    color: '#0f172a',
    overflow: 'hidden',
  },
  triggerName: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#fff',
    maxWidth: '120px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  dropdownMenu: {
    position: 'absolute',
    top: '48px',
    right: 0,
    width: '260px',
    background: 'rgba(20, 20, 30, 0.95)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '1rem 0',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
    zIndex: 1100,
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'left',
  },
  dropdownHeader: {
    padding: '0.5rem 1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  signedInLabel: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    fontWeight: 'bold',
    letterSpacing: '0.05em',
  },
  userEmail: {
    fontSize: '0.88rem',
    color: '#fff',
    fontWeight: '600',
    wordBreak: 'break-all',
  },
  roleBadge: {
    fontSize: '0.75rem',
    color: '#FFD60A',
    fontWeight: 'bold',
    marginTop: '0.25rem',
  },
  dropdownDivider: {
    height: '1px',
    background: 'var(--border-color)',
    margin: '0.75rem 0',
  },
  dropdownItem: {
    background: 'none',
    border: 'none',
    width: '100%',
    padding: '0.65rem 1.25rem',
    textAlign: 'left',
    color: 'var(--text)',
    fontSize: '0.9rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'background 0.2s',
  },
  authButtons: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  mobileToggle: {
    background: 'none',
    border: 'none',
    color: 'var(--text)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  mobileMenu: {
    position: 'absolute',
    top: '70px',
    left: 0,
    width: '100%',
    background: '#0d0d0d',
    borderBottom: '1px solid var(--border-color)',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    zIndex: 999,
  },
  mobileNavLink: (active) => ({
    color: active ? '#fff' : 'var(--text-muted)',
    textDecoration: 'none',
    fontSize: '1.05rem',
    fontWeight: active ? '600' : '500',
    padding: '0.5rem 0',
    borderBottom: active ? '1px solid var(--highlight)' : 'none',
  }),
  mobileUserSection: {
    marginTop: '0.5rem',
    paddingTop: '1rem',
    borderTop: '1px solid var(--border-color)',
  },
  mobileUserName: {
    fontSize: '1rem',
    color: 'var(--text-muted)',
  },
  mobileAuthButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginTop: '0.5rem',
    paddingTop: '1rem',
    borderTop: '1px solid var(--border-color)',
  },
  avatarContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '1.25rem',
  },
  avatarLarge: {
    position: 'relative',
    width: '100px',
    height: '100px',
    borderRadius: '24px',
    background: 'var(--success)',
    color: '#0f172a',
    fontSize: '2.5rem',
    fontWeight: '800',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 20px rgba(0, 180, 216, 0.2)',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: '-4px',
    right: '-4px',
    background: '#E94560',
    border: 'none',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 10px rgba(233, 69, 96, 0.4)',
  },
  trashBtn: {
    position: 'absolute',
    bottom: '-4px',
    left: '-4px',
    background: '#E94560',
    border: 'none',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 10px rgba(233, 69, 96, 0.4)',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 'inherit',
    objectFit: 'cover',
  },
  profileMeta: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '1.5rem',
  },
  profileName: {
    fontSize: '1.4rem',
    fontWeight: 'bold',
    color: '#fff',
    margin: 0,
  },
  profileRoleBadge: {
    background: 'rgba(0, 180, 216, 0.1)',
    border: '1px solid rgba(0, 180, 216, 0.2)',
    color: '#00B4D8',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: 'bold',
  },
  profileDivider: {
    height: '1px',
    background: 'var(--border-color)',
    margin: '1rem 0',
  },
  profileDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginBottom: '1.75rem',
    textAlign: 'left',
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  infoIcon: {
    color: '#00B4D8',
  },
  infoText: {
    fontSize: '0.95rem',
    color: 'var(--text)',
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
    background: 'rgba(30, 30, 46, 0.98)',
    padding: '2.5rem',
    borderRadius: '16px',
    border: '1px solid var(--border-color)',
    maxWidth: '380px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
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
    color: 'var(--text-muted)',
    fontSize: '1.75rem',
    cursor: 'pointer',
    lineHeight: '1',
    transition: 'color 0.2s',
  },
  modalBody: {
    width: '100%',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: '100%',
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
    outline: 'none',
  },
};

const injectMediaQueries = () => {
  const style = document.createElement('style');
  style.innerHTML = `
    @media (max-width: 767px) {
      .nav-center, .nav-right { display: none !important; }
    }
    @media (min-width: 768px) {
      .mobile-toggle-btn { display: none !important; }
      .nav-center, .nav-right { display: flex !important; }
      .mobile-menu { display: none !important; }
    }
    .dropdown-menu-item:hover {
      background: rgba(255, 255, 255, 0.05) !important;
    }
    .delete-btn-hover:hover {
      background: rgba(233, 69, 96, 0.08) !important;
    }
  `;
  document.head.appendChild(style);
};
if (typeof document !== 'undefined') injectMediaQueries();

export default Navbar;
