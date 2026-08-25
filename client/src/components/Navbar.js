import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="brand">🩺 MediConnect</Link>
      <div className="links">
        {user ? (
          <>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/appointments">Appointments</Link>
            {user.role === 'patient' && <Link to="/book">Book Appointment</Link>}
            <Link to="/prescriptions">Prescriptions</Link>
            {user.role === 'patient' && <Link to="/history">Medical History</Link>}
            {user.role === 'doctor' && <Link to="/availability">My Availability</Link>}
            <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>
              {user.name} ({user.role})
            </span>
            <button className="btn btn-outline" onClick={handleLogout}>Log out</button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register" className="btn btn-primary">Sign up</Link>
          </>
        )}
      </div>
    </nav>
  );
}