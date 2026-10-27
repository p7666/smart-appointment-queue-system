import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Phone, Mail, Copy, Eye, Check } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function BusinessDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authToken, setAuthToken] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [appointments, setAppointments] = useState([]);
  const [dateFilter, setDateFilter] = useState(''); 
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');
  
  const [modal, setModal] = useState({ isOpen: false, message: '', isAlert: false, action: null });
  const [detailsModal, setDetailsModal] = useState({ isOpen: false, appointment: null });
  const [copiedField, setCopiedField] = useState(null); // Tracks which field was copied

  useEffect(() => {
    const savedToken = localStorage.getItem('staffAuthToken');
    if (savedToken) {
      setAuthToken(savedToken);
      setIsAuthenticated(true);
    }
  }, []);

  const clearStaffSession = () => {
    localStorage.removeItem('staffAuthToken');
    setAuthToken('');
    setIsAuthenticated(false);
    setAppointments([]);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { email, password });
      localStorage.setItem('staffAuthToken', res.data.token);
      setAuthToken(res.data.token);
      setIsAuthenticated(true);
      setAuthError('');
      setError('');
    } catch (err) {
      setAuthError(err.response?.data?.error || 'Login failed. Please try again.');
    }
  };

  const fetchAppointments = useCallback(async (silent = false) => {
    try {
      let query = '';
      if (dateFilter) query += `date=${dateFilter}&`;
      if (statusFilter) query += `status=${statusFilter}`;
      
      const res = await axios.get(`${API_URL}/appointments?${query}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setAppointments(res.data);
    } catch (err) {
      if (err.response?.status === 401) {
        clearStaffSession();
        setAuthError('Your staff session has expired. Please sign in again.');
        return;
      }
      if (!silent) setError('Failed to fetch schedule');
    }
  }, [authToken, dateFilter, statusFilter]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAppointments();
    }
  }, [fetchAppointments, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    const intervalId = setInterval(() => {
      fetchAppointments(true);
    }, 15000);

    return () => clearInterval(intervalId);
  }, [fetchAppointments, isAuthenticated]);

  const handleStatusChange = (id, currentStatus, newStatus) => {
    if (currentStatus === 'Cancelled' && newStatus === 'Completed') {
      setModal({ isOpen: true, message: "You cannot complete a cancelled appointment.", isAlert: true });
      return;
    }
    
    if (newStatus === 'Cancelled') {
      setModal({
        isOpen: true,
        message: "Are you sure you want to cancel this booking?",
        isAlert: false,
        action: () => executeStatusChange(id, newStatus)
      });
      return;
    }

    executeStatusChange(id, newStatus);
  };

  const executeStatusChange = async (id, newStatus) => {
    setModal({ isOpen: false, message: '', isAlert: false, action: null });
    try {
      const endpoint = newStatus === 'Completed'
        ? `${API_URL}/appointments/${id}/complete`
        : `${API_URL}/appointments/${id}/status`;
      const payload = newStatus === 'Completed' ? {} : { status: newStatus };
      await axios.patch(endpoint, payload, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      await fetchAppointments();
      if (detailsModal.isOpen) {
        setDetailsModal(prev => ({ ...prev, appointment: { ...prev.appointment, status: newStatus } }));
      }
    } catch (err) {
      if (err.response?.status === 401) {
        clearStaffSession();
        setAuthError('Your staff session has expired. Please sign in again.');
        return;
      }
      setError(err.response?.data?.error || 'Update failed');
    }
  };

  // Professional inline copy feedback
  const copyToClipboard = (text, field) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => {
      setCopiedField(null);
    }, 2500);
  };

  if (!isAuthenticated) {
    return (
      <div style={{ maxWidth: '400px', margin: '2rem auto', textAlign: 'center' }}>
        <h2>Staff Login</h2>
        <p>Please log in to manage the business schedule.</p>
        {authError && <div className="alert alert-error">{authError}</div>}
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <input type="email" placeholder="Enter staff email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <input type="password" placeholder="Enter staff password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button className="btn" type="submit" style={{ width: '100%' }}>Login</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      {modal.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '400px', width: '90%', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <p style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>{modal.message}</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              {!modal.isAlert && (
                <button className="btn btn-outline" onClick={() => setModal({ isOpen: false, message: '', isAlert: false, action: null })}>Cancel Action</button>
              )}
              <button className="btn" onClick={() => {
                if (modal.action) modal.action();
                else setModal({ isOpen: false, message: '', isAlert: false, action: null });
              }}>OK</button>
            </div>
          </div>
        </div>
      )}

      {detailsModal.isOpen && detailsModal.appointment && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '500px', width: '90%', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '1rem', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Appointment Details</h3>
              <button className="btn btn-outline" onClick={() => setDetailsModal({ isOpen: false, appointment: null })}>Close</button>
            </div>
            
            <p><strong>Service:</strong> {detailsModal.appointment.serviceId?.name || 'Unknown'}</p>
            <p><strong>Date & Time:</strong> {detailsModal.appointment.date} at {detailsModal.appointment.slot}</p>
            <p><strong>Status:</strong> {detailsModal.appointment.status}</p>
            <hr style={{ margin: '1rem 0', borderTop: '1px solid #e5e7eb' }} />
            
            <p><strong>Customer:</strong> {detailsModal.appointment.customerName}</p>
            
            {detailsModal.appointment.customerEmail && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <a href={`mailto:${detailsModal.appointment.customerEmail}`} style={{ color: '#2563eb' }}><Mail size={18} /></a>
                <span>{detailsModal.appointment.customerEmail}</span>
                <button 
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: copiedField === 'email' ? '#16a34a' : '#6b7280', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }} 
                  onClick={() => copyToClipboard(detailsModal.appointment.customerEmail, 'email')}
                >
                  {copiedField === 'email' ? <><Check size={16} /> Copied!</> : <Copy size={16} />}
                </button>
              </div>
            )}
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <a href={`tel:${detailsModal.appointment.customerPhone}`} style={{ color: '#2563eb' }}><Phone size={18} /></a>
              <span>{detailsModal.appointment.customerPhone}</span>
              <button 
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: copiedField === 'phone' ? '#16a34a' : '#6b7280', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }} 
                onClick={() => copyToClipboard(detailsModal.appointment.customerPhone, 'phone')}
              >
                {copiedField === 'phone' ? <><Check size={16} /> Copied!</> : <Copy size={16} />}
              </button>
            </div>

            <hr style={{ margin: '1rem 0', borderTop: '1px solid #e5e7eb' }} />
            <p><strong>Duration:</strong> {detailsModal.appointment.durationMinutes ? `${detailsModal.appointment.durationMinutes} minutes` : 'Standard'}</p>
            <p><strong>Description/Notes:</strong></p>
            <div style={{ background: '#f3f4f6', padding: '1rem', borderRadius: '4px', minHeight: '60px' }}>
              {detailsModal.appointment.description || <em>No additional notes provided.</em>}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Business Schedule</h2>
        <button className="btn btn-outline" onClick={() => {
          clearStaffSession();
          setEmail('');
          setPassword('');
        }}>
          Logout
        </button>
      </div>
      
      {error && <div className="alert alert-error">{error}</div>}
      
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
          <label>Filter by Date</label>
          <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
        </div>
        <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
          <label>Filter by Status</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Customer</th>
              <th>Service</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {appointments.length === 0 ? (
              <tr><td colSpan="5">No appointments found.</td></tr>
            ) : (
              appointments.map(apt => (
                <tr key={apt._id}>
                  <td>{apt.date}<br/><strong>{apt.slot}</strong></td>
                  <td>{apt.customerName}</td>
                  <td>{apt.serviceId?.name || 'Unknown'}</td>
                  <td><strong>{apt.status}</strong></td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <button 
                        className="btn btn-outline" 
                        title="View Details"
                        style={{ padding: '0.5rem', display: 'flex', alignItems: 'center' }} 
                        onClick={() => setDetailsModal({ isOpen: true, appointment: apt })}
                      >
                        <Eye size={18} />
                      </button>
                      {apt.status === 'Confirmed' && (
                        <>
                          <button className="btn btn-success" onClick={() => handleStatusChange(apt._id, apt.status, 'Completed')}>Complete</button>
                          <button className="btn btn-danger" onClick={() => handleStatusChange(apt._id, apt.status, 'Cancelled')}>Cancel</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}