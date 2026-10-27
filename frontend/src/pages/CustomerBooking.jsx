import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CalendarPlus, CheckCircle2, ShieldCheck, Zap, Clock, Sparkles } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getCurrentDateTimeIST = () => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(new Date()).reduce((values, part) => {
    if (part.type !== 'literal') values[part.type] = part.value;
    return values;
  }, {});

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute)
  };
};

const isISTSlotInPast = (date, slot, nowIST = getCurrentDateTimeIST()) => {
  if (date !== nowIST.date) return false;
  const [hour, minute] = slot.split(':').map(Number);
  return hour * 60 + minute <= nowIST.minutes;
};

export default function CustomerBooking() {
  const [services, setServices] = useState([]);
  const [formData, setFormData] = useState({
    serviceId: '', date: '', slot: '', customerName: '', customerEmail: '', customerPhone: '', description: '', durationMinutes: ''
  });
  const [allSlots, setAllSlots] = useState([]);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios.get(`${API_URL}/services`).then(res => setServices(res.data));
  }, []);

  useEffect(() => {
    if (formData.date) {
      fetchSlots(formData.date);
    }
  }, [formData.date]);

  const fetchSlots = async (date) => {
    setSlotsLoading(true);
    try {
      const res = await axios.get(`${API_URL}/slots?date=${date}`);
      const slots = res.data.allSlots;
      const booked = res.data.bookedSlots;
      setAllSlots(slots);
      setBookedSlots(booked);

      if (formData.slot && (
        !slots.includes(formData.slot) ||
        booked.includes(formData.slot) ||
        isISTSlotInPast(date, formData.slot)
      )) {
        setFormData(prev => ({ ...prev, slot: '' }));
      }
    } catch (err) {
      setError('Failed to load slots');
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await axios.post(`${API_URL}/appointments`, formData);
      setSuccess(res.data);
      setFormData({ serviceId: '', date: '', slot: '', customerName: '', customerEmail: '', customerPhone: '', description: '', durationMinutes: '' });
    } catch (err) {
      if (err.response?.status === 409) {
        setError(err.response.data.error);
        fetchSlots(formData.date); 
      } else {
        setError(err.response?.data?.error || 'Booking failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedServiceObj = services.find(s => s._id === formData.serviceId);

  if (success) {
    return (
      <div className="container" style={{ maxWidth: '580px', textAlign: 'center' }}>
        <div className="success-icon-badge">
          <CalendarPlus size={36} color="#166534" />
        </div>
        <h2 style={{ color: '#166534', marginBottom: '0.5rem' }}>Booking Confirmed!</h2>
        <p style={{ fontSize: '1.05rem', marginBottom: '1.75rem', color: '#334155' }}>
          Thank you, <strong>{success.customerName}</strong>. Your appointment is scheduled for <strong>{success.date}</strong> at <strong>{success.slot}</strong>.
        </p>
        <button className="btn" onClick={() => setSuccess(null)}>Book Another Appointment</button>
      </div>
    );
  }

  return (
    <div className="booking-split-wrapper">
      {/* LEFT PANEL: Rich SaaS Info & Live Summary (No empty space) */}
      <div className="booking-visual-panel">
        <div>
          <span className="badge"><Sparkles size={13} style={{ marginRight: '5px' }} /> Smart Scheduling</span>
          <h2>Book your appointment in seconds.</h2>
          <p className="panel-subtitle">
            Real-time slot availability with instant confirmation and conflict-free queue management.
          </p>

          {/* Feature Highlights */}
          <div className="feature-list">
            <div className="feature-item">
              <div className="feature-icon"><Zap size={20} /></div>
              <div>
                <h4>Instant Slot Locking</h4>
                <p>Protected against double-booking with real-time server verification.</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon"><Clock size={20} /></div>
              <div>
                <h4>Smart Time Filtering</h4>
                <p>Automatically hides past hours and dynamically frees cancelled slots.</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon"><ShieldCheck size={20} /></div>
              <div>
                <h4>Self-Service Management</h4>
                <p>Check your booking status or cancel anytime from the Manage tab.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Live Selection Preview Card at Bottom of Left Panel */}
        <div className="live-preview-card">
          <div className="preview-header">
            <span className="status-dot"></span>
            <span>Live Booking Summary</span>
          </div>
          <div className="preview-body">
            <div className="preview-row">
              <span>Service:</span>
              <strong>{selectedServiceObj ? selectedServiceObj.name : 'Not selected'}</strong>
            </div>
            <div className="preview-row">
              <span>Date:</span>
              <strong>{formData.date || 'Select a date'}</strong>
            </div>
            <div className="preview-row">
              <span>Time Slot:</span>
              <strong>{formData.slot || 'Select a slot'}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Clean Stacked Form */}
      <div className="booking-form-panel">
        <div className="form-heading">
          <h2>Reservation Details</h2>
          <p>Fill in your details below to confirm your slot.</p>
        </div>
        
        {error && <div className="alert alert-error">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Select Service *</label>
            <select required value={formData.serviceId} onChange={e => setFormData({...formData, serviceId: e.target.value})}>
              <option value="">Choose a service...</option>
              {services.map(s => (
                <option key={s._id} value={s._id}>
                  {s.name} {s.durationMinutes ? `(${s.durationMinutes} mins)` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Select Date *</label>
            <input 
              type="date" 
              required 
              min={getCurrentDateTimeIST().date}
              value={formData.date} 
              onChange={e => setFormData({...formData, date: e.target.value})} 
            />
          </div>

          {formData.date && (
            <div className="form-group">
              <label>Time Slots (available and unavailable) *</label>
              <div className="slots-grid">
                {slotsLoading ? <p className="slots-empty-text">Loading time slots...</p> : allSlots.map(slot => {
                  const isPast = isISTSlotInPast(formData.date, slot);
                  const isBooked = bookedSlots.includes(slot);
                  const isUnavailable = isPast || isBooked;
                  const status = isPast ? 'Past' : isBooked ? 'Booked' : formData.slot === slot ? 'Selected' : 'Available';

                  return (
                    <button
                      key={slot}
                      type="button"
                      className={`btn slot-btn ${isUnavailable ? 'unavailable' : 'btn-outline'} ${formData.slot === slot ? 'selected' : ''}`}
                      disabled={isUnavailable}
                      aria-label={`${slot}, ${status}`}
                      onClick={() => setFormData({...formData, slot})}
                    >
                      <span className={isUnavailable ? 'slot-time-unavailable' : ''}>{slot}</span>
                      <span className="slot-status">{status}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Full Name *</label>
            <input 
              type="text" 
              required 
              placeholder="e.g. John Doe" 
              value={formData.customerName} 
              onChange={e => setFormData({...formData, customerName: e.target.value})} 
            />
          </div>

          {/* Stacked One Below The Other */}
          <div className="form-group">
            <label>Email Address (Optional)</label>
            <input 
              type="email" 
              placeholder="name@example.com" 
              value={formData.customerEmail} 
              onChange={e => setFormData({...formData, customerEmail: e.target.value})} 
            />
          </div>

          <div className="form-group">
            <label>Phone Number *</label>
            <input 
              type="tel" 
              required 
              placeholder="e.g. 9876543210" 
              value={formData.customerPhone} 
              onChange={e => setFormData({...formData, customerPhone: e.target.value})} 
            />
          </div>

          <div className="form-group">
            <label>Custom Duration in Minutes (Optional)</label>
            <input 
              type="number" 
              min="15" 
              step="15"
              placeholder="Default service duration applies if left blank"
              value={formData.durationMinutes} 
              onChange={e => setFormData({...formData, durationMinutes: e.target.value})} 
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.75rem' }}>
            <label>Additional Notes / Description (Optional)</label>
            <textarea 
              placeholder="Share any specific requirements or topics you want to cover..."
              value={formData.description} 
              onChange={e => setFormData({...formData, description: e.target.value})}
              rows="3"
            />
          </div>

          <button className="btn submit-btn" type="submit" disabled={!formData.slot || loading}>
            <CheckCircle2 size={18} />
            {loading ? 'Confirming Appointment...' : 'Confirm Booking'}
          </button>
        </form>
      </div>
    </div>
  );
}