import React, { useState, useEffect, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { SocketContext } from '../context/SocketContext';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  DollarSign, Percent, Calendar, Users, Download, RefreshCw, Layers,
  Ban, Trash2, UserCheck, CheckCircle
} from 'lucide-react';

const AdminDashboard = () => {
  const socket = useContext(SocketContext);
  const { user } = useContext(AuthContext);
  const location = useLocation();

  const showDashboard = location.pathname === '/dashboard';
  const showUsers = location.pathname === '/dashboard/users';
  const showSettings = location.pathname === '/dashboard/settings';
  const showBookings = location.pathname === '/dashboard/bookings';
  const showRates = location.pathname === '/dashboard/rates';
  const [stats, setStats] = useState({
    totalRevenue: 0,
    occupancyRate: 0,
    totalSpots: 0,
    occupiedSpots: 0,
    activeBookings: 0,
    totalUsers: 0,
  });
  const [chartWidth, setChartWidth] = useState(600);
  const [chartData, setChartData] = useState([]);
  const [floorBreakdown, setFloorBreakdown] = useState([]);
  const [spots, setSpots] = useState([]);
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [footerForm, setFooterForm] = useState({
    description: '',
    address: '',
    phone: '',
    email: '',
    branches: '',
    workingHours: '',
    socials: [],
    showMap: true,
    mapLink: '',
    branchConfigs: []
  });
  const [savingFooter, setSavingFooter] = useState(false);
  const [pricingForm, setPricingForm] = useState({
    baseRate: 30,
    twoHourRate: 50,
    fourHourRate: 90,
    fullDayRate: 150,
  });
  const [savingPricing, setSavingPricing] = useState(false);

  const handleUpdateSpotStatus = async (spotId, newStatus) => {
    setUpdatingStatus(true);
    try {
      const res = await axios.patch(`/api/spots/${spotId}/status`, { status: newStatus });
      if (res.data.success) {
        toast.success(`Spot status updated to ${newStatus}`);
        setSpots(prevSpots => prevSpots.map(s => s._id === spotId ? { ...s, status: newStatus } : s));
        fetchStats(selectedBranch);
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

  const fetchStats = async (branchName) => {
    try {
      const url = branchName ? `/api/admin/stats?branch=${encodeURIComponent(branchName)}` : '/api/admin/stats';
      const res = await axios.get(url);
      if (res.data.success) {
        setStats(res.data.stats);
      }
    } catch (err) {
      console.error('Error fetching admin stats:', err.message);
    }
  };

  const fetchChartData = async (branchName) => {
    try {
      const url = branchName ? `/api/admin/revenue?branch=${encodeURIComponent(branchName)}` : '/api/admin/revenue';
      const res = await axios.get(url);
      if (res.data.success) {
        setChartData(res.data.revenueTrends || []);
        setFloorBreakdown(res.data.spotBreakdown || []);
      }
    } catch (err) {
      console.error('Error fetching chart data:', err.message);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/api/admin/users');
      if (res.data.success) {
        setUsers(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching users:', err.message);
    }
  };

  const handleToggleBlock = async (userId, currentStatus) => {
    try {
      const res = await axios.patch(`/api/admin/users/${userId}/block`);
      if (res.data.success) {
        toast.success(res.data.message || `User has been ${currentStatus ? 'unblocked' : 'blocked'}`);
        fetchUsers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user block status');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to permanently delete this user account? This action cannot be undone.')) {
      return;
    }
    try {
      const res = await axios.delete(`/api/admin/users/${userId}`);
      if (res.data.success) {
        toast.success('User account deleted successfully');
        fetchUsers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user account');
    }
  };

  const handleApproveUser = async (userId) => {
    try {
      const res = await axios.patch(`/api/admin/users/${userId}/approve`);
      if (res.data.success) {
        toast.success(res.data.message || 'User approved successfully');
        fetchUsers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve user');
    }
  };

  const getRoleBadgeStyle = (role) => {
    if (role === 'superadmin') {
      return {
        background: 'rgba(255, 214, 10, 0.1)',
        border: '1px solid rgba(255, 214, 10, 0.3)',
        color: '#FFD60A',
        padding: '0.25rem 0.5rem',
        borderRadius: '4px',
        fontSize: '0.75rem',
        fontWeight: 'bold',
      };
    }
    if (role === 'operationadmin') {
      return {
        background: 'rgba(0, 180, 216, 0.1)',
        border: '1px solid rgba(0, 180, 216, 0.3)',
        color: '#00B4D8',
        padding: '0.25rem 0.5rem',
        borderRadius: '4px',
        fontSize: '0.75rem',
        fontWeight: 'bold',
      };
    }
    return {
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      color: 'var(--text-muted)',
      padding: '0.25rem 0.5rem',
      borderRadius: '4px',
      fontSize: '0.75rem',
    };
  };

  const getStatusBadgeStyle = (isBlocked, isApproved) => {
    if (isApproved === false) {
      return {
        background: 'rgba(255, 214, 10, 0.1)',
        border: '1px solid rgba(255, 214, 10, 0.3)',
        color: '#FFD60A',
        padding: '0.25rem 0.5rem',
        borderRadius: '4px',
        fontSize: '0.75rem',
        fontWeight: 'bold',
      };
    }
    if (isBlocked) {
      return {
        background: 'rgba(233, 69, 96, 0.1)',
        border: '1px solid rgba(233, 69, 96, 0.3)',
        color: 'var(--highlight)',
        padding: '0.25rem 0.5rem',
        borderRadius: '4px',
        fontSize: '0.75rem',
        fontWeight: 'bold',
      };
    }
    return {
      background: 'rgba(34, 197, 94, 0.1)',
      border: '1px solid rgba(34, 197, 94, 0.3)',
      color: '#22c55e',
      padding: '0.25rem 0.5rem',
      borderRadius: '4px',
      fontSize: '0.75rem',
      fontWeight: 'bold',
    };
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

  const fetchSpots = async (branchName) => {
    try {
      const url = branchName ? `/api/spots?branch=${encodeURIComponent(branchName)}` : '/api/spots';
      const res = await axios.get(url);
      if (res.data.success) {
        setSpots(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching spots:', err.message);
    }
  };

  const fetchFooterConfig = async () => {
    try {
      const res = await axios.get('/api/footer');
      if (res.data.success && res.data.data) {
        const d = res.data.data;
        setFooterForm({
          description: d.description || '',
          address: d.address || '',
          phone: d.phone || '',
          email: d.email || '',
          branches: Array.isArray(d.branches) ? d.branches.join(', ') : '',
          workingHours: d.workingHours || '',
          socials: d.socials || [],
          showMap: d.showMap !== false,
          mapLink: d.mapLink || '',
          branchConfigs: d.branchConfigs || []
        });
      }
    } catch (err) {
      console.error('Error fetching footer configuration:', err.message);
    }
  };

  const handleUpdateFooter = async (e) => {
    e.preventDefault();
    setSavingFooter(true);
    try {
      const payload = {
        ...footerForm,
        branches: footerForm.branchConfigs.map(bc => bc.name).filter(Boolean)
      };
      const res = await axios.put('/api/footer', payload);
      if (res.data.success) {
        toast.success('System footer configuration updated successfully!');
        if (res.data.data && res.data.data.branches) {
          setBranches(res.data.data.branches);
          if (res.data.data.branches.length > 0) {
            setSelectedBranch(prev => res.data.data.branches.includes(prev) ? prev : res.data.data.branches[0]);
          } else {
            setSelectedBranch('');
          }
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update footer configuration');
    } finally {
      setSavingFooter(false);
    }
  };

  const fetchPricingConfig = async (branchName) => {
    try {
      const url = branchName ? `/api/pricing?branch=${encodeURIComponent(branchName)}` : '/api/pricing';
      const res = await axios.get(url);
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

  const handleSocialChange = (index, field, value) => {
    const newSocials = [...footerForm.socials];
    newSocials[index] = { ...newSocials[index], [field]: value };
    setFooterForm({ ...footerForm, socials: newSocials });
  };

  const removeSocial = (index) => {
    const newSocials = footerForm.socials.filter((_, i) => i !== index);
    setFooterForm({ ...footerForm, socials: newSocials });
  };

  const addSocial = () => {
    setFooterForm({
      ...footerForm,
      socials: [...footerForm.socials, { platform: 'instagram', value: '', showIcon: true }]
    });
  };

  const handleAddBranchConfig = () => {
    const newBranch = { name: '', address: '', mapLink: '', phone: '', email: '' };
    setFooterForm(prev => ({
      ...prev,
      branchConfigs: [...(prev.branchConfigs || []), newBranch]
    }));
  };

  const handleRemoveBranchConfig = (index) => {
    setFooterForm(prev => ({
      ...prev,
      branchConfigs: (prev.branchConfigs || []).filter((_, i) => i !== index)
    }));
  };

  const handleBranchConfigChange = (index, field, value) => {
    setFooterForm(prev => {
      const updated = [...(prev.branchConfigs || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, branchConfigs: updated };
    });
  };

  const loadAllData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    await Promise.all([
      fetchBranches(),
      fetchUsers(),
      fetchAllBookings(),
      fetchFooterConfig(),
    ]);

    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    if (selectedBranch) {
      fetchStats(selectedBranch);
      fetchChartData(selectedBranch);
      fetchSpots(selectedBranch);
      fetchPricingConfig(selectedBranch);
    }
  }, [selectedBranch]);

  useEffect(() => {
    loadAllData();

    // Auto-refresh stats every 30 seconds
    const interval = setInterval(() => {
      if (selectedBranch) {
        fetchStats(selectedBranch);
        fetchChartData(selectedBranch);
        fetchSpots(selectedBranch);
      }
      fetchUsers();
      fetchAllBookings();
    }, 30000);

    // Socket listener for live updates
    if (socket) {
      socket.on('spotStatusChanged', (updatedSpot) => {
        if (updatedSpot.branch === selectedBranch) {
          // Update local spots array
          setSpots((prevSpots) =>
            prevSpots.map((s) => (s._id === updatedSpot.spotId ? { ...s, status: updatedSpot.status } : s))
          );
          // Refresh counts
          fetchStats(selectedBranch);
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

  // Handle dynamic window resize to avoid Recharts ResponsiveContainer infinite loops
  useEffect(() => {
    const handleResize = () => {
      const container = document.getElementById('revenue-chart-container');
      if (container) {
        setChartWidth(container.clientWidth || 600);
      }
    };

    // Initial measurement
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [loading]);

  // Export Bookings to CSV
  const exportToCSV = () => {
    if (bookings.length === 0) {
      return toast.error('No booking records to export');
    }

    const headers = [
      'Booking ID', 'User Name', 'User Email', 'Spot Number', 
      'Floor', 'Vehicle Number', 'Start Time', 'End Time', 
      'Duration (Hrs)', 'Amount (INR)', 'Payment Status', 'Status'
    ];

    const rows = bookings.map(b => [
      b.bookingId || `BK-${b._id.toString().slice(-6).toUpperCase()}`,
      b.userId?.name || 'N/A',
      b.userId?.email || 'N/A',
      b.spotId?.spotNumber || 'N/A',
      b.spotId?.floor || 'N/A',
      b.vehicleNumber,
      new Date(b.startTime).toLocaleString(),
      new Date(b.endTime).toLocaleString(),
      b.duration,
      b.amount,
      b.paymentStatus,
      b.status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `parksmart_bookings_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Bookings exported to CSV!');
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
            <h1 style={styles.title}>Super Admin Panel</h1>
            <p style={styles.subtitle}>Real-time revenue metrics, system capacity status, and client logs.</p>
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
            <button className="btn btn-outline" onClick={exportToCSV}>
              <Download size={16} /> Export Bookings CSV
            </button>
            <button className="btn btn-primary" onClick={() => loadAllData(true)} disabled={refreshing}>
              <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
              {refreshing ? 'Refreshing...' : 'Sync Data'}
            </button>
          </div>
        </div>
      )}

      {showUsers && (
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>User Directory</h1>
            <p style={styles.subtitle}>Manage and monitor registered customer accounts and administrative roles.</p>
          </div>
          <div style={styles.headerActions}>
            <button className="btn btn-primary" onClick={() => loadAllData(true)} disabled={refreshing}>
              <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
              {refreshing ? 'Refreshing...' : 'Sync Data'}
            </button>
          </div>
        </div>
      )}

      {showSettings && (
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>System Settings</h1>
            <p style={styles.subtitle}>Configure and customize footer channels, branches, social links, and contact info.</p>
          </div>
          <div style={styles.headerActions}>
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
          <div className="skeleton" style={{ height: '100px', borderRadius: '12px' }}></div>
          <div className="skeleton" style={{ height: '300px', borderRadius: '12px', marginTop: '2rem' }}></div>
        </div>
      ) : (
        <>
          {showDashboard && (
            <>
              {/* Metrics Row */}
              <div style={styles.metricsGrid}>
            <div style={styles.metricCard} className="glass-card">
              <div style={styles.metricIconBox}><DollarSign size={24} color="var(--success)" /></div>
              <div>
                <span style={styles.metricLabel}>Total Revenue</span>
                <h2 style={styles.metricVal}>₹{stats.totalRevenue}</h2>
              </div>
            </div>

            <div style={styles.metricCard} className="glass-card">
              <div style={styles.metricIconBox}><Percent size={24} color="#FFD60A" /></div>
              <div>
                <span style={styles.metricLabel}>Occupancy Rate</span>
                <h2 style={styles.metricVal}>{stats.occupancyRate}%</h2>
              </div>
            </div>

            <div style={styles.metricCard} className="glass-card">
              <div style={styles.metricIconBox}><Calendar size={24} color="var(--success)" /></div>
              <div>
                <span style={styles.metricLabel}>Active Bookings</span>
                <h2 style={styles.metricVal}>{stats.activeBookings}</h2>
              </div>
            </div>

            <div style={styles.metricCard} className="glass-card">
              <div style={styles.metricIconBox}><Users size={24} color="var(--highlight)" /></div>
              <div>
                <span style={styles.metricLabel}>Total Customers</span>
                <h2 style={styles.metricVal}>{stats.totalUsers}</h2>
              </div>
            </div>
          </div>

          {/* Revenue Chart Section */}
          <div style={styles.chartContainer} className="glass-card">
            <h3 style={styles.chartTitle}>Revenue Growth (Last 7 Days)</h3>
            <div id="revenue-chart-container" style={{ width: '100%', height: 260, overflow: 'hidden' }}>
              {chartData.length === 0 ? (
                <div style={styles.noChartData}>No revenue logged in the past week</div>
              ) : (
                <AreaChart width={chartWidth} height={250} data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--success)" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="var(--success)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} />
                  <Tooltip contentStyle={{ background: 'var(--primary)', borderColor: 'var(--border-color)', color: '#fff' }} />
                  <Area type="monotone" dataKey="revenue" stroke="var(--success)" fillOpacity={1} fill="url(#colorRevenue)" name="Revenue (₹)" />
                </AreaChart>
              )}
            </div>
          </div>

          <div style={styles.dashboardSection}>
            {/* Live Spot status */}
            <div style={styles.liveGridCard} className="glass-card">
              <h3 style={styles.chartTitle}>Live Floor Capacity Status</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '-1.25rem', marginBottom: '1.5rem' }}>
                Click on any spot dot below to manually override its status (Available, Occupied, Reserved).
              </p>
              <div style={styles.floorPills}>
                {floorBreakdown.map((floor) => (
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
          </>
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
                    No booking records found {selectedBranch ? `for ${selectedBranch} branch` : ''}.
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

          {/* Users Table */}
          {showUsers && (
            <div style={styles.dashboardSection}>
              <div style={styles.userListCard} className="glass-card">
              <h3 style={styles.chartTitle}>User Directory & Management</h3>
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tr}>
                      <th style={styles.th}>Name</th>
                      <th style={styles.th}>Email Address</th>
                      <th style={styles.th}>Phone Number</th>
                      <th style={styles.th}>Role</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Registered</th>
                      <th style={{ ...styles.th, textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u._id} style={styles.trHover}>
                        <td style={styles.td}>{u.name}</td>
                        <td style={styles.td}>{u.email}</td>
                        <td style={styles.td}>{u.phone}</td>
                        <td style={styles.td}>
                          <span style={getRoleBadgeStyle(u.role)}>
                            {u.role === 'superadmin' ? 'Super Admin' : u.role === 'operationadmin' ? 'Ops Admin' : 'Customer'}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={getStatusBadgeStyle(u.isBlocked, u.isApproved)}>
                            {u.isApproved === false ? 'Pending' : u.isBlocked ? 'Blocked' : 'Active'}
                          </span>
                        </td>
                        <td style={styles.td}>{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td style={{ ...styles.td, display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center', minHeight: '44px' }}>
                          {!(u._id === user?.id || u._id === user?._id) && u.email !== 'super@parking.com' && (
                            <>
                              {u.isApproved === false && (
                                <button
                                  onClick={() => handleApproveUser(u._id)}
                                  title="Approve User"
                                  className="btn btn-outline"
                                  style={{ 
                                    padding: '0.4rem', 
                                    borderColor: 'var(--success)', 
                                    color: 'var(--success)',
                                    display: 'inline-flex',
                                    alignItems: 'center'
                                  }}
                                >
                                  <CheckCircle size={14} />
                                </button>
                              )}
                              {(u.role !== 'superadmin' || user?.email === 'super@parking.com') && (
                                <>
                                  <button
                                    onClick={() => handleToggleBlock(u._id, u.isBlocked)}
                                    title={u.isBlocked ? 'Unblock User' : 'Block User'}
                                    className="btn btn-outline"
                                    style={{ 
                                      padding: '0.4rem', 
                                      borderColor: u.isBlocked ? 'var(--success)' : 'var(--highlight)', 
                                      color: u.isBlocked ? 'var(--success)' : 'var(--highlight)',
                                      display: 'inline-flex',
                                      alignItems: 'center'
                                    }}
                                  >
                                    {u.isBlocked ? <UserCheck size={14} /> : <Ban size={14} />}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUser(u._id)}
                                    title="Delete User"
                                    className="btn btn-outline"
                                    style={{ 
                                      padding: '0.4rem', 
                                      borderColor: 'var(--highlight)', 
                                      color: 'var(--highlight)',
                                      display: 'inline-flex',
                                      alignItems: 'center'
                                    }}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          )}

          {/* System Footer Customization */}
          {showSettings && (
            <>
              <div style={styles.footerCard} className="glass-card">
            <div>
              <h3 style={{ ...styles.chartTitle, marginBottom: '0.25rem' }}>System Footer Customization</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>
                Configure and update the public contact details, locations, and social media handles visible to all portal visitors.
              </p>
            </div>
            
            <form onSubmit={handleUpdateFooter} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div style={styles.formGrid}>
                {/* General Info Column */}
                <div style={styles.formSection}>
                  <h4 style={{ fontSize: '0.95rem', color: '#fff', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>General Information</h4>
                  
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Company Description</label>
                    <textarea 
                      className="form-input" 
                      style={styles.formTextarea}
                      value={footerForm.description}
                      onChange={(e) => setFooterForm({ ...footerForm, description: e.target.value })}
                      placeholder="Brief description about the parking solution..."
                      required
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Physical Address</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={footerForm.address}
                      onChange={(e) => setFooterForm({ ...footerForm, address: e.target.value })}
                      placeholder="e.g. 26st Lazarus road, Periyamulla, Negombo"
                      required
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Phone Number</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={footerForm.phone}
                        onChange={(e) => setFooterForm({ ...footerForm, phone: e.target.value })}
                        placeholder="+94 77 431 1051"
                        required
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Email Address</label>
                      <input 
                        type="email" 
                        className="form-input" 
                        value={footerForm.email}
                        onChange={(e) => setFooterForm({ ...footerForm, email: e.target.value })}
                        placeholder="support@parksmart.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Working Hours</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={footerForm.workingHours}
                      onChange={(e) => setFooterForm({ ...footerForm, workingHours: e.target.value })}
                      placeholder="e.g. 24 Hours & 7 Days"
                      required
                    />
                  </div>

                  <div style={{ marginTop: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                      <h4 style={{ fontSize: '0.95rem', color: '#fff', margin: 0, fontWeight: 'bold' }}>Branch Locations & Maps</h4>
                      <button 
                        type="button" 
                        className="btn btn-outline" 
                        onClick={handleAddBranchConfig}
                        style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', cursor: 'pointer' }}
                      >
                        + Add Branch
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      {(!footerForm.branchConfigs || footerForm.branchConfigs.length === 0) ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', margin: '1rem 0' }}>No branch locations configured. Click "+ Add Branch" to add one.</p>
                      ) : (
                        footerForm.branchConfigs.map((bc, idx) => (
                          <div key={idx} style={{ background: 'rgba(255,255,255,0.01)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)', position: 'relative' }}>
                            <button
                              type="button"
                              onClick={() => handleRemoveBranchConfig(idx)}
                              style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', color: 'var(--highlight)', cursor: 'pointer' }}
                              title="Remove Branch"
                            >
                              <Trash2 size={16} />
                            </button>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
                              <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label" style={{ fontSize: '0.78rem' }}>Branch Name</label>
                                <input 
                                  type="text" 
                                  className="form-input" 
                                  style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
                                  value={bc.name}
                                  onChange={(e) => handleBranchConfigChange(idx, 'name', e.target.value)}
                                  placeholder="e.g. Wattala"
                                  required
                                />
                              </div>
                              <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label" style={{ fontSize: '0.78rem' }}>Physical Address</label>
                                <input 
                                  type="text" 
                                  className="form-input" 
                                  style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
                                  value={bc.address}
                                  onChange={(e) => handleBranchConfigChange(idx, 'address', e.target.value)}
                                  placeholder="e.g. Wattala Branch, Negombo Road"
                                  required
                                />
                              </div>
                            </div>

                            <div className="form-group" style={{ margin: 0, marginBottom: '0.75rem' }}>
                              <label className="form-label" style={{ fontSize: '0.78rem' }}>Google Maps Embed / Share URL (Optional)</label>
                              <input 
                                type="text" 
                                className="form-input" 
                                style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
                                value={bc.mapLink}
                                onChange={(e) => handleBranchConfigChange(idx, 'mapLink', e.target.value)}
                                placeholder="https://maps.google.com/... or iframe code"
                              />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                              <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label" style={{ fontSize: '0.78rem' }}>Phone Number (Optional)</label>
                                <input 
                                  type="text" 
                                  className="form-input" 
                                  style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
                                  value={bc.phone}
                                  onChange={(e) => handleBranchConfigChange(idx, 'phone', e.target.value)}
                                  placeholder="e.g. +94 77 431 1051"
                                />
                              </div>
                              <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label" style={{ fontSize: '0.78rem' }}>Email Address (Optional)</label>
                                <input 
                                  type="email" 
                                  className="form-input" 
                                  style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
                                  value={bc.email}
                                  onChange={(e) => handleBranchConfigChange(idx, 'email', e.target.value)}
                                  placeholder="e.g. wattala@parksmart.com"
                                />
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="form-label" style={{ marginBottom: 0 }}>Google Maps Embed / Share URL (Optional)</label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={footerForm.showMap !== false}
                          onChange={(e) => setFooterForm({ ...footerForm, showMap: e.target.checked })}
                          style={{ cursor: 'pointer' }}
                        />
                        Show Map
                      </label>
                    </div>
                    <input 
                      type="url" 
                      className="form-input" 
                      value={footerForm.mapLink}
                      onChange={(e) => setFooterForm({ ...footerForm, mapLink: e.target.value })}
                      placeholder="e.g. https://www.google.com/maps/embed?pb=..."
                      disabled={footerForm.showMap === false}
                    />
                    <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '4px', display: 'block' }}>
                      If left blank, a dynamic map using the Physical Address above will be used.
                    </small>
                  </div>
                </div>

                {/* Social Handles Column */}
                <div style={styles.formSection}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                    <h4 style={{ fontSize: '0.95rem', color: '#fff', margin: 0, fontWeight: 'bold' }}>Social Media & Channels</h4>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {footerForm.socials.map((social, index) => (
                      <div key={index} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', background: 'rgba(255,255,255,0.01)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <div style={{ flex: '0 0 130px' }}>
                          <select
                            className="form-input"
                            value={social.platform}
                            onChange={(e) => handleSocialChange(index, 'platform', e.target.value)}
                            style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem', background: 'rgba(13, 13, 13, 0.6)' }}
                          >
                            <option value="whatsapp">WhatsApp</option>
                            <option value="instagram">Instagram</option>
                            <option value="twitter">Twitter/X</option>
                            <option value="facebook">Facebook</option>
                            <option value="tiktok">TikTok</option>
                            <option value="youtube">YouTube</option>
                            <option value="linkedin">LinkedIn</option>
                            <option value="website">Website</option>
                          </select>
                        </div>
                        <div style={{ flex: 1 }}>
                          <input
                            type="text"
                            className="form-input"
                            value={social.value}
                            onChange={(e) => handleSocialChange(index, 'value', e.target.value)}
                            placeholder={social.platform === 'whatsapp' ? 'e.g. 94774311051' : 'https://...'}
                            style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                            required
                          />
                        </div>
                        <div style={{ flex: '0 0 95px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: 'var(--text-muted)', cursor: 'pointer', margin: 0 }}>
                            <input
                              type="checkbox"
                              checked={social.showIcon !== false}
                              onChange={(e) => handleSocialChange(index, 'showIcon', e.target.checked)}
                              style={{ cursor: 'pointer' }}
                            />
                            Show Icon
                          </label>
                        </div>
                        <div>
                          <button
                            type="button"
                            className="btn btn-outline"
                            style={{ padding: '0.5rem', borderColor: 'var(--highlight)', color: 'var(--highlight)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                            onClick={() => removeSocial(index)}
                            title="Delete Platform"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.85rem', width: '100%', borderStyle: 'dashed' }}
                      onClick={addSocial}
                    >
                      + Add Social Media Link
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary" style={{ padding: '0.85rem 2.5rem' }} disabled={savingFooter}>
                  {savingFooter ? 'Saving Settings...' : 'Save Footer Settings'}
                </button>
              </div>
            </form>
          </div>
            </>
          )}

          {showRates && (
            <div style={styles.dashboardSection}>
              <div style={styles.footerCard} className="glass-card">
                <div>
                  <h3 style={{ ...styles.chartTitle, marginBottom: '0.25rem' }}>Parking Rate Customization</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>
                    Configure the billing rates for different durations (Base Rate/1 hour, 2 hours, 4 hours, and Full Day).
                  </p>
                </div>
                
                <form onSubmit={handleUpdatePricing} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.5rem' }}>
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
                    <button type="submit" className="btn btn-primary" style={{ padding: '0.85rem 2.5rem' }} disabled={savingPricing}>
                      {savingPricing ? 'Saving Rates...' : 'Save Pricing Rates'}
                    </button>
                  </div>
                </form>
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
    flexDirection: 'column',
    justifyContent: 'space-between',
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
  },
  subtitle: {
    color: 'var(--text-muted)',
    fontSize: '0.95rem',
  },
  loadingStats: {
    width: '100%',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem',
  },
  metricCard: {
    padding: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
  },
  metricIconBox: {
    width: '50px',
    height: '50px',
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  metricVal: {
    fontFamily: 'var(--font-display)',
    fontWeight: '800',
    fontSize: '1.75rem',
    color: '#fff',
    lineHeight: '1.2',
  },
  chartContainer: {
    padding: '2rem',
    marginBottom: '2rem',
  },
  chartTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.2rem',
    marginBottom: '1.5rem',
  },
  noChartData: {
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-muted)',
  },
  dashboardSection: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '2rem',
  },
  liveGridCard: {
    padding: '2rem',
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
    cursor: 'help',
    transition: 'transform 0.15s',
  },
  userListCard: {
    padding: '2rem',
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: '0.9rem',
  },
  tr: {
    borderBottom: '1px solid var(--border-color)',
  },
  trHover: {
    borderBottom: '1px solid rgba(255,255,255,0.03)',
    ':hover': {
      background: 'rgba(255,255,255,0.01)',
    },
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
  footerCard: {
    padding: '2.5rem',
    marginTop: '2.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
    textAlign: 'left',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '2rem',
  },
  formSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  formTextarea: {
    width: '100%',
    background: 'rgba(13, 13, 13, 0.6)',
    border: '1px solid var(--border-color)',
    color: 'var(--text)',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    fontFamily: 'var(--font-body)',
    fontSize: '0.95rem',
    minHeight: '100px',
    resize: 'vertical',
    transition: 'all 0.2s ease',
  },
};

export default AdminDashboard;
