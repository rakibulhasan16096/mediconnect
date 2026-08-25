import React, { useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function DoctorAvailability() {
  const { user } = useAuth();
  const [availability, setAvailability] = useState(
    user.availability?.length
      ? user.availability
      : []
  );
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const addSlot = () => {
    setAvailability([...availability, { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30 }]);
  };

  const updateSlot = (idx, field, value) => {
    const copy = [...availability];
    copy[idx][field] = field === 'dayOfWeek' || field === 'slotDurationMinutes' ? Number(value) : value;
    setAvailability(copy);
  };

  const removeSlot = (idx) => setAvailability(availability.filter((_, i) => i !== idx));

  const handleSave = async () => {
    setError('');
    setSuccess('');
    try {
      await api.put('/users/availability', { availability });
      setSuccess('Availability updated successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update availability');
    }
  };

  return (
    <div className="container">
      <h1>Manage My Availability</h1>
      <p style={{ color: '#6b7280' }}>Define your weekly recurring schedule. Patients can only book within these windows.</p>
      {error && <div className="error-banner">{error}</div>}
      {success && <div className="success-banner">{success}</div>}

      <div className="card">
        {availability.map((slot, idx) => (
          <div key={idx} className="grid-2" style={{ marginBottom: 12, alignItems: 'end' }}>
            <div className="form-group">
              <label>Day of Week</label>
              <select value={slot.dayOfWeek} onChange={(e) => updateSlot(idx, 'dayOfWeek', e.target.value)}>
                {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Slot Duration (min)</label>
              <input type="number" min="10" step="5" value={slot.slotDurationMinutes} onChange={(e) => updateSlot(idx, 'slotDurationMinutes', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Start Time</label>
              <input type="time" value={slot.startTime} onChange={(e) => updateSlot(idx, 'startTime', e.target.value)} />
            </div>
            <div className="form-group">
              <label>End Time</label>
              <input type="time" value={slot.endTime} onChange={(e) => updateSlot(idx, 'endTime', e.target.value)} />
            </div>
            <button className="btn btn-danger" style={{ height: 38 }} onClick={() => removeSlot(idx)}>Remove</button>
          </div>
        ))}
        <button className="btn btn-outline" onClick={addSlot}>+ Add Time Window</button>
        <div style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={handleSave}>Save Availability</button>
        </div>
      </div>
    </div>
  );
}