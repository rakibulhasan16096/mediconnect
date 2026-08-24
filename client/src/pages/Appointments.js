import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import AppointmentCard from '../components/AppointmentCard';

export default function Appointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/appointments', { params: filter ? { status: filter } : {} });
      setAppointments(data.appointments);
    } catch (err) {
      setError('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const handleConfirm = async (id) => {
    await api.put(`/appointments/${id}/confirm`);
    load();
  };

  const handleCancel = async (id) => {
    const reason = window.prompt('Reason for cancellation (optional):') || '';
    await api.put(`/appointments/${id}/cancel`, { reason });
    load();
  };

  const handleComplete = async (appointment) => {
    const notes = window.prompt('Add visit notes (optional):') || '';
    await api.put(`/appointments/${appointment._id}/complete`, { notes });
    load();
  };

  const handleJoin = (appointment) => {
    navigate(`/call/${appointment._id}`);
  };

  return (
    <div className="container">
      <h1>My Appointments</h1>
      {error && <div className="error-banner">{error}</div>}

      <div className="form-group" style={{ maxWidth: 240 }}>
        <label>Filter by status</label>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : appointments.length === 0 ? (
        <p style={{ color: '#6b7280' }}>No appointments found.</p>
      ) : (
        appointments.map((a) => (
          <AppointmentCard
            key={a._id}
            appointment={a}
            role={user.role}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
            onComplete={handleComplete}
            onJoin={handleJoin}
          />
        ))
      )}
    </div>
  );
}