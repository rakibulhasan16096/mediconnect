import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function BookAppointment() {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [reason, setReason] = useState('');
  const [consultationType, setConsultationType] = useState('video');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/users/doctors').then(({ data }) => setDoctors(data.doctors)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedDoctor || !date) return;
    setLoadingSlots(true);
    setSelectedSlot(null);
    api
      .get('/appointments/slots', { params: { doctorId: selectedDoctor._id, date } })
      .then(({ data }) => setSlots(data.slots))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [selectedDoctor, date]);

  const handleBook = async () => {
    setError('');
    setSuccess('');
    if (!selectedDoctor || !selectedSlot || !reason.trim()) {
      setError('Please select a doctor, a time slot, and provide a reason for the visit.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/appointments', {
        doctorId: selectedDoctor._id,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        reasonForVisit: reason,
        consultationType,
      });
      setSuccess('Appointment booked successfully! Awaiting doctor confirmation.');
      setTimeout(() => navigate('/appointments'), 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to book appointment');
    } finally {
      setSubmitting(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="container">
      <h1>Book an Appointment</h1>
      {error && <div className="error-banner">{error}</div>}
      {success && <div className="success-banner">{success}</div>}

      <div className="card">
        <div className="form-group">
          <label>Select Doctor</label>
          <select
            value={selectedDoctor?._id || ''}
            onChange={(e) => setSelectedDoctor(doctors.find((d) => d._id === e.target.value) || null)}
          >
            <option value="">-- Choose a doctor --</option>
            {doctors.map((d) => (
              <option key={d._id} value={d._id}>
                Dr. {d.name} — {d.specialization || 'General Practice'} (${d.consultationFee})
              </option>
            ))}
          </select>
        </div>

        {selectedDoctor?.bio && (
          <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>{selectedDoctor.bio}</p>
        )}

        <div className="form-group">
          <label>Date</label>
          <input type="date" min={todayStr} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        {selectedDoctor && date && (
          <div>
            <label>Available Slots</label>
            {loadingSlots ? (
              <p>Loading slots...</p>
            ) : slots.length === 0 ? (
              <p style={{ color: '#6b7280' }}>No slots available on this date. Try another day.</p>
            ) : (
              <div className="slot-grid">
                {slots.map((s) => (
                  <button
                    key={s.startTime}
                    type="button"
                    className={`slot-btn ${selectedSlot?.startTime === s.startTime ? 'selected' : ''}`}
                    onClick={() => setSelectedSlot(s)}
                  >
                    {new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="form-group" style={{ marginTop: 16 }}>
          <label>Consultation Type</label>
          <select value={consultationType} onChange={(e) => setConsultationType(e.target.value)}>
            <option value="video">Video Consultation</option>
            <option value="in_person">In-Person</option>
          </select>
        </div>

        <div className="form-group">
          <label>Reason for Visit</label>
          <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Briefly describe your symptoms or reason for the visit" />
        </div>

        <button className="btn btn-primary" onClick={handleBook} disabled={submitting}>
          {submitting ? 'Booking...' : 'Confirm Booking'}
        </button>
      </div>
    </div>
  );
}