import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'patient',
    phone: '', specialization: '', licenseNumber: '', consultationFee: '',
  });
  const [error, setError] = useState('');
  const { register, loading } = useAuth();
  const navigate = useNavigate();

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    const result = await register(form);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="card">
        <h2>Create your account</h2>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>I am a</label>
            <select value={form.role} onChange={update('role')}>
              <option value="patient">Patient</option>
              <option value="doctor">Doctor</option>
            </select>
          </div>
          <div className="form-group">
            <label>Full Name</label>
            <input value={form.name} onChange={update('name')} required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={form.email} onChange={update('email')} required />
          </div>
          <div className="form-group">
            <label>Password (min 8 characters)</label>
            <input type="password" value={form.password} onChange={update('password')} required />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input value={form.phone} onChange={update('phone')} />
          </div>

          {form.role === 'doctor' && (
            <>
              <div className="form-group">
                <label>Specialization</label>
                <input value={form.specialization} onChange={update('specialization')} placeholder="e.g. Cardiology" />
              </div>
              <div className="form-group">
                <label>License Number</label>
                <input value={form.licenseNumber} onChange={update('licenseNumber')} />
              </div>
              <div className="form-group">
                <label>Consultation Fee ($)</label>
                <input type="number" min="0" value={form.consultationFee} onChange={update('consultationFee')} />
              </div>
            </>
          )}

          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>
        <p style={{ marginTop: 14, fontSize: '0.9rem' }}>
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}