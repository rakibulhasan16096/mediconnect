import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [upcoming, setUpcoming] = useState([]);
  const [stats, setStats] = useState({ pending: 0, confirmed: 0, completed: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/appointments');
        const all = data.appointments;
        const now = new Date();
        const upcomingList = all
          .filter((a) => new Date(a.startTime) >= now && ['pending', 'confirmed'].includes(a.status))
          .slice(0, 5);
        setUpcoming(upcomingList);
        setStats({
          pending: all.filter((a) => a.status === 'pending').length,
          confirmed: all.filter((a) => a.status === 'confirmed').length,
          completed: all.filter((a) => a.status === 'completed').length,
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="container">
      <h1>Welcome back, {user.name}</h1>
      <p style={{ color: '#6b7280' }}>
        {user.role === 'doctor' ? 'Here is an overview of your practice.' : 'Here is an overview of your care.'}
      </p>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card"><h3>{stats.pending}</h3><span>Pending</span></div>
        <div className="card"><h3>{stats.confirmed}</h3><span>Confirmed</span></div>
      </div>

      <div className="card">
        <h2>Quick Actions</h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {user.role === 'patient' && <Link className="btn btn-primary" to="/book">Book an Appointment</Link>}
          <Link className="btn btn-outline" to="/appointments">View All Appointments</Link>
          <Link className="btn btn-outline" to="/prescriptions">Prescriptions</Link>
          {user.role === 'patient' && <Link className="btn btn-outline" to="/history">Medical History</Link>}
          {user.role === 'doctor' && <Link className="btn btn-outline" to="/availability">Manage Availability</Link>}
        </div>
      </div>

      <h2 style={{ marginTop: 24 }}>Upcoming</h2>
      {loading ? (
        <p>Loading...</p>
      ) : upcoming.length === 0 ? (
        <p style={{ color: '#6b7280' }}>No upcoming appointments.</p>
      ) : (
        upcoming.map((a) => (
          <div className="card" key={a._id}>
            <strong>{user.role === 'doctor' ? a.patient?.name : `Dr. ${a.doctor?.name}`}</strong>
            <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>
              {new Date(a.startTime).toLocaleString()}
            </div>
          </div>
        ))
      )}
    </div>
  );
}