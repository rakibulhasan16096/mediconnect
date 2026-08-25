import React from 'react';

const STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
};

export default function AppointmentCard({ appointment, role, onConfirm, onCancel, onComplete, onJoin }) {
  const other = role === 'doctor' ? appointment.patient : appointment.doctor;
  const start = new Date(appointment.startTime);
  const end = new Date(appointment.endTime);
  const canJoin =
    appointment.status === 'confirmed' &&
    Math.abs(Date.now() - start.getTime()) < 60 * 60 * 1000; // within an hour window

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <strong>{role === 'doctor' ? other?.name : `Dr. ${other?.name}`}</strong>
          {role === 'patient' && other?.specialization && (
            <span style={{ color: '#6b7280' }}> — {other.specialization}</span>
          )}
          <div style={{ fontSize: '0.9rem', color: '#6b7280', marginTop: 4 }}>
            {start.toLocaleDateString()} · {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div style={{ marginTop: 6 }}>{appointment.reasonForVisit}</div>
        </div>
        <span className={`badge badge-${appointment.status}`}>{STATUS_LABELS[appointment.status]}</span>
      </div>

      {appointment.notes && (
        <div style={{ marginTop: 10, fontSize: '0.9rem', background: '#f9fafb', padding: 10, borderRadius: 6 }}>
          <strong>Notes:</strong> {appointment.notes}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
        {canJoin && (
          <button className="btn btn-primary" onClick={() => onJoin(appointment)}>
            Join Video Call
          </button>
        )}
        {role === 'doctor' && appointment.status === 'pending' && (
          <button className="btn btn-primary" onClick={() => onConfirm(appointment._id)}>
            Confirm
          </button>
        )}
        {role === 'doctor' && appointment.status === 'confirmed' && (
          <button className="btn btn-outline" onClick={() => onComplete(appointment)}>
            Mark Completed
          </button>
        )}
        {['pending', 'confirmed'].includes(appointment.status) && (
          <button className="btn btn-danger" onClick={() => onCancel(appointment._id)}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}