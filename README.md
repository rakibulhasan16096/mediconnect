# MediConnect — Healthcare Appointment & Telemedicine System

A full-stack MERN application for doctor-patient scheduling, live video consultations,
e-prescription management, and medical history tracking.

## Tech Stack
- **MongoDB** — data storage (users, appointments, prescriptions, medical records)
- **Express.js** — REST API
- **React** — SPA frontend (React Router, Context API)
- **Node.js** — runtime
- **Socket.io + WebRTC** — real-time peer-to-peer video consultations & in-call chat

## Features
- **Auth & security**: JWT auth, bcrypt password hashing (cost 12), account lockout after
  5 failed logins, rate-limited login endpoint, XSS sanitization, Helmet security headers,
  role-based access control (patient / doctor / admin), password-change token invalidation.
- **Scheduling**: doctors define recurring weekly availability; the API generates open
  slots per day, excludes already-booked times, and re-validates against both the doctor's
  schedule and a live conflict check at booking time to prevent double-booking races.
- **Video consultations**: each appointment gets a unique signaling room; Socket.io
  handles offer/answer/ICE exchange between exactly the two authenticated participants,
  with mute/camera toggle and in-call text chat.
- **E-prescriptions**: doctors issue prescriptions (diagnosis + structured medication list)
  tied to an appointment, with a SHA-256 integrity signature; patients view/download their own.
- **Medical history**: doctors log diagnoses, lab results, allergies, vaccinations, surgeries,
  and notes against a patient's timeline; patients have read-only access to their own record.

## Project Structure
```
telemedicine-app/
├── server/              Express API
│   ├── config/          DB connection
│   ├── models/          Mongoose schemas (User, Appointment, Prescription, MedicalRecord)
│   ├── middleware/      auth (JWT + RBAC), error handling
│   ├── controllers/     business logic
│   ├── routes/          route definitions
│   ├── socket/          WebRTC signaling handler
│   └── server.js        entry point
└── client/              React SPA
    └── src/
        ├── api/          axios instance with auth interceptor
        ├── context/      AuthContext (login/register/logout state)
        ├── components/   Navbar, PrivateRoute, AppointmentCard
        └── pages/        Login, Register, Dashboard, BookAppointment,
                           Appointments, VideoCall, Prescriptions,
                           MedicalHistory, DoctorAvailability
```

## Setup

### Prerequisites
- Node.js 18+
- MongoDB running locally or a connection string (e.g. MongoDB Atlas)

### 1. Backend
```bash
cd server
cp .env.example .env      # then edit MONGO_URI / JWT_SECRET as needed
npm install
npm run dev                # nodemon, or `npm start` for production
```
The API runs on `http://localhost:5000` by default.

### 2. Frontend
```bash
cd client
npm install
npm start
```
The app runs on `http://localhost:3000` and expects the API at
`http://localhost:5000/api` (override with `REACT_APP_API_URL` and
`REACT_APP_SOCKET_URL` env vars if deploying separately).

## Trying it out
1. Register one account as a **doctor** and one as a **patient** (use two browsers or
   incognito windows).
2. As the doctor, go to **My Availability** and add a weekly time window.
3. As the patient, go to **Book Appointment**, pick the doctor, a date, and an open slot.
4. As the doctor, confirm the appointment from **Appointments**.
5. At the scheduled time (or any time in dev, since the join window is generous),
   both sides click **Join Video Call** to test the WebRTC session and chat.
6. After the visit, the doctor can mark it **Completed**, add notes, issue a
   **prescription**, and log a **medical record** entry for the patient.

## Security Notes (for demonstration/discussion)
- Passwords are never returned in API responses (`toJSON` strips them).
- Login uses a generic "invalid email or password" message to prevent user enumeration.
- Booking conflicts are re-checked server-side immediately before insert to close the
  race window between slot listing and booking.
- Video rooms are private per-appointment and permit only two participants.
- In production, add: HTTPS/TLS termination, refresh-token rotation, a TURN server for
  WebRTC behind restrictive NATs, file-upload virus scanning for attachments, and
  audit logging for HIPAA-style compliance.