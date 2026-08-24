import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const TYPE_LABELS = {
  diagnosis: 'Diagnosis',
  lab_result: 'Lab Result',
  allergy: 'Allergy',
  vaccination: 'Vaccination',
  surgery: 'Surgery',
  note: 'Note',
};

export default function MedicalHistory() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/medical-records/${user._id}`)
      .then(({ data }) => setRecords(data.records))
      .catch(() => setError('Failed to load medical history'))
      .finally(() => setLoading(false));
  }, [user._id]);

  return (
    <div className="container">
      <h1>My Medical History</h1>
      {error && <div className="error-banner">{error}</div>}
      {loading ? (
        <p>Loading...</p>
      ) : records.length === 0 ? (
        <p style={{ color: '#6b7280' }}>No medical records yet. Records added by your doctors will appear here.</p>
      ) : (
        records.map((r) => (
          <div className="card" key={r._id}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>{r.title}</strong>
              <span className="badge badge-confirmed">{TYPE_LABELS[r.type]}</span>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#6b7280', margin: '4px 0' }}>
              {new Date(r.recordedAt).toLocaleDateString()} · Dr. {r.createdBy?.name}
              {r.createdBy?.specialization ? ` (${r.createdBy.specialization})` : ''}
            </div>
            <p>{r.description}</p>
          </div>
        ))
      )}
    </div>
  );
}