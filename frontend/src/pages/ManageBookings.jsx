import React, { useState } from 'react';
import axios from 'axios';
import { Search } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function ManageBookings() {
  const [lookupContact, setLookupContact] = useState('');
  const [myBookings, setMyBookings] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  
  const [modal, setModal] = useState({ isOpen: false, message: '', isAlert: false, action: null });

  const handleLookup = async (e) => {
    e.preventDefault();
    setHasSearched(true);
    try {
      const res = await axios.get(`${API_URL}/appointments/lookup`, {
        params: { contact: lookupContact.trim() }
      });
      setMyBookings(res.data);
      if (res.data.length === 0) {
        setModal({ isOpen: true, message: "No bookings found for this contact.", isAlert: true });
      }
    } catch (err) {
      setModal({ isOpen: true, message: "Lookup failed. Please try again.", isAlert: true });
    }
  };

  const initiateCancel = (id) => {
    setModal({
      isOpen: true,
      message: "Are you sure you want to cancel this appointment?",
      isAlert: false,
      action: () => executeCancel(id)
    });
  };

  const executeCancel = async (id) => {
    setModal({ isOpen: false, message: '', isAlert: false, action: null });
    try {
      await axios.patch(`${API_URL}/appointments/${id}/cancel`, { contact: lookupContact.trim() });
      setModal({ isOpen: true, message: "Appointment cancelled successfully.", isAlert: true });
      setMyBookings(prev => prev.map(b => b._id === id ? {...b, status: 'Cancelled'} : b));
    } catch (err) {
      setModal({ isOpen: true, message: "Failed to cancel the appointment.", isAlert: true });
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Custom Modal */}
      {modal.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '400px', width: '90%', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <p style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>{modal.message}</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              {!modal.isAlert && (
                <button className="btn btn-outline" onClick={() => setModal({ isOpen: false, message: '', isAlert: false, action: null })}>Keep Booking</button>
              )}
              <button className="btn" onClick={() => {
                if (modal.action) modal.action();
                else setModal({ isOpen: false, message: '', isAlert: false, action: null });
              }}>OK</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2>Manage My Bookings</h2>
        <p style={{ maxWidth: '500px', margin: '0 auto' }}>
          Enter your email or phone number below to view your upcoming appointments or cancel a scheduled service.
        </p>
      </div>
      
      <form onSubmit={handleLookup} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap', maxWidth: '600px', margin: '0 auto 3rem' }}>
        <div className="form-group" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
          <label>Contact Email or Phone Number</label>
          <input 
            type="text" 
            required 
            placeholder="e.g. name@email.com or 1234567890"
            value={lookupContact} 
            onChange={e => setLookupContact(e.target.value)} 
          />
        </div>
        <button className="btn" type="submit">
          <Search size={18} /> Search
        </button>
      </form>
      
      {hasSearched && myBookings.length > 0 && (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h3 style={{ marginBottom: '1rem' }}>Your Appointments</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {myBookings.map(b => (
              <li key={b._id} style={{ padding: '1.5rem', background: '#fff', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', boxShadow: 'var(--shadow-sm)' }}>
                <div>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>{b.serviceId?.name || 'Service Appointment'}</h4>
                  <div style={{ color: '#374151', fontSize: '0.95rem' }}>
                    <strong>{b.date}</strong> at <strong>{b.slot}</strong>
                  </div>
                  <div style={{ marginTop: '0.5rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.75rem', 
                      borderRadius: '999px', 
                      fontSize: '0.85rem', 
                      fontWeight: '600',
                      backgroundColor: b.status === 'Confirmed' ? '#dbeafe' : b.status === 'Completed' ? '#dcfce7' : '#f3f4f6',
                      color: b.status === 'Confirmed' ? '#1e40af' : b.status === 'Completed' ? '#166534' : '#4b5563'
                    }}>
                      {b.status}
                    </span>
                  </div>
                </div>
                {b.status === 'Confirmed' && (
                  <button onClick={() => initiateCancel(b._id)} className="btn btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>
                    Cancel Appointment
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}