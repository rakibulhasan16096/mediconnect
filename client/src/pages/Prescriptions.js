import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const emptyMed = { name: '', dosage: '', frequency: '', durationDays: 7, instructions: '' };

export default function Prescriptions() {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Doctor-only issuing form state
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [form, setForm] = useState({ patientId: '', appointmentId: '', diagnosis: '', additionalNotes: '' });
  const [medications, setMedications] = useState([{ ...emptyMed }]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/prescriptions');
      setPrescriptions(data.prescriptions);
    } catch (err) {
      setError('Failed to load prescriptions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (user.role !== 'doctor') return;
    api.get('/appointments', { params: { status: 'completed' } }).then(({ data }) => {
      setAppointments(data.appointments);
      const uniquePatients = [];
      const seen = new Set();
      data.appointments.forEach((a) => {
        if (!seen.has(a.patient._id)) {
          seen.add(a.patient._id);
          uniquePatients.push(a.patient);
        }
      });
      setPatients(uniquePatients);
    });
  }, [user.role]);

  const updateMed = (idx, field, value) => {
    const copy = [...medications];
    copy[idx][field] = value;
    setMedications(copy);
  };

  const addMed = () => setMedications([...medications, { ...emptyMed }]);
  const removeMed = (idx) => setMedications(medications.filter((_, i) => i !== idx));

  const handleIssue = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.patientId || !form.diagnosis.trim() || medications.some((m) => !m.name || !m.dosage || !m.frequency)) {
      setError('Please complete patient, diagnosis, and all medication fields.');
      return;
    }
    try {
      await api.post('/prescriptions', { ...form, medications });
      setSuccess('Prescription issued successfully.');
      setShowForm(false);
      setForm({ patientId: '', appointmentId: '', diagnosis: '', additionalNotes: '' });
      setMedications([{ ...emptyMed }]);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to issue prescription');
    }
  };

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Prescriptions</h1>
        {user.role === 'doctor' && (
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ Issue Prescription'}
          </button>
        )}
      </div>
      {error && <div className="error-banner">{error}</div>}
      {success && <div className="success-banner">{success}</div>}

      {showForm && (
        <form className="card" onSubmit={handleIssue}>
          <h3>New Prescription</h3>
          <div className="form-group">
            <label>Patient</label>
            <select value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })}>
              <option value="">-- Select patient --</option>
              {patients.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Related Appointment (optional)</label>
            <select value={form.appointmentId} onChange={(e) => setForm({ ...form, appointmentId: e.target.value })}>
              <option value="">-- None --</option>
              {appointments.filter((a) => a.patient._id === form.patientId).map((a) => (
                <option key={a._id} value={a._id}>{new Date(a.startTime).toLocaleDateString()} — {a.reasonForVisit}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Diagnosis</label>
            <input value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} />
          </div>

          <label>Medications</label>
          {medications.map((med, idx) => (
            <div key={idx} className="card" style={{ background: '#f9fafb' }}>
              <div className="grid-2">
                <div className="form-group">
                  <label>Name</label>
                  <input value={med.name} onChange={(e) => updateMed(idx, 'name', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Dosage</label>
                  <input value={med.dosage} onChange={(e) => updateMed(idx, 'dosage', e.target.value)} placeholder="e.g. 500mg" />
                </div>
                <div className="form-group">
                  <label>Frequency</label>
                  <input value={med.frequency} onChange={(e) => updateMed(idx, 'frequency', e.target.value)} placeholder="e.g. twice daily" />
                </div>
                <div className="form-group">
                  <label>Duration (days)</label>
                  <input type="number" min="1" value={med.durationDays} onChange={(e) => updateMed(idx, 'durationDays', Number(e.target.value))} />
                </div>
              </div>
              <div className="form-group">
                <label>Instructions</label>
                <input value={med.instructions} onChange={(e) => updateMed(idx, 'instructions', e.target.value)} placeholder="e.g. take with food" />
              </div>
              {medications.length > 1 && (
                <button type="button" className="btn btn-outline" onClick={() => removeMed(idx)}>Remove</button>
              )}
            </div>
          ))}
          <button type="button" className="btn btn-outline" onClick={addMed} style={{ marginBottom: 14 }}>+ Add Medication</button>

          <div className="form-group">
            <label>Additional Notes</label>
            <textarea rows={2} value={form.additionalNotes} onChange={(e) => setForm({ ...form, additionalNotes: e.target.value })} />
          </div>

          <button className="btn btn-primary" type="submit">Issue Prescription</button>
        </form>
      )}

      {loading ? <p>Loading...</p> : prescriptions.length === 0 ? (
        <p style={{ color: '#6b7280' }}>No prescriptions found.</p>
      ) : (
        prescriptions.map((p) => (
          <div className="card" key={p._id}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <strong>{p.diagnosis}</strong>
                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                  {user.role === 'doctor' ? `Patient: ${p.patient.name}` : `Dr. ${p.doctor.name} (${p.doctor.specialization || 'General'})`}
                  {' · '}{new Date(p.issuedAt).toLocaleDateString()}
                </div>
              </div>
              <span className={`badge ${p.status === 'active' ? 'badge-confirmed' : 'badge-cancelled'}`}>{p.status}</span>
            </div>
            <ul style={{ marginTop: 10 }}>
              {p.medications.map((m, i) => (
                <li key={i}>
                  <strong>{m.name}</strong> — {m.dosage}, {m.frequency}, for {m.durationDays} days
                  {m.instructions && <em> ({m.instructions})</em>}
                </li>
              ))}
            </ul>
            {p.additionalNotes && <p style={{ fontSize: '0.9rem' }}>{p.additionalNotes}</p>}
          </div>
        ))
      )}
    </div>
  );
}