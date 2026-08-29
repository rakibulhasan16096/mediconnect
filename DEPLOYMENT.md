Deployment guide — Vercel (frontend) + Render (backend) + MongoDB Atlas

Overview
--------
This repository is a MERN app (client/ and server/). The recommended production deployment is:
- Frontend: Vercel (Create React App static build)
- Backend: Render (Web Service supporting WebSockets / Socket.IO)
- Database: MongoDB Atlas

This document lists the exact steps and environment variables needed for a smooth deployment.

1) MongoDB Atlas (database)
---------------------------
1. Create a MongoDB Atlas account and a new cluster (free tier is fine for demos).
2. Create a database user and note the username/password.
3. From the Atlas UI, get the connection string (SRV). Example:
   mongodb+srv://<username>:<password>@cluster0.abcd.mongodb.net/mediconnect?retryWrites=true&w=majority
4. Add a project IP allowlist entry (0.0.0.0/0 for development only). For production restrict to trusted IPs.
5. Save the connection string for Render's environment variable MONGO_URI.

2) Backend: Render (web service)
--------------------------------
Render is straightforward and supports WebSockets. Steps:

A. Connect service
- Go to https://dashboard.render.com
- Create a new "Web Service" and connect it to your GitHub repo (branch you want to deploy).
- Set the Root directory to server/ (this is a monorepo: backend lives in server).

B. Build & Start commands
- Build Command: (leave empty for a Node app) or `npm install` (Render runs `npm install` automatically)
- Start Command: `npm start` (server/package.json already defines `start: node server.js`)
- Environment: Node 18+ is recommended; optionally set an `engines` field in server/package.json.

C. Environment variables (set in Render dashboard > Environment)
- MONGO_URI = <Atlas connection string>
- JWT_SECRET = <long random secret>
- CLIENT_URL = https://<your-vercel-domain>.vercel.app  (set after frontend is deployed)
- NODE_ENV = production
- (Optional) OTHER_SECRETS for mail service, third-party APIs, TURN credentials, etc.

D. WebSocket settings
- Ensure Render's web service has WebSockets enabled (Render supports WebSockets by default for Web Services).
- Socket.IO should work over HTTPS/WSS; make sure you use the correct socket URL (see frontend env below).

E. Verify
- After deploy, Render will give a service URL, e.g. https://mediconnect-api.onrender.com
- Visit `https://<render-url>/api/health` to confirm the API is healthy.

3) Frontend: Vercel (Create React App)
-------------------------------------
A. Connect to repo
- Go to https://vercel.com and import the same GitHub repo.
- For a monorepo, set the Project Root to `/client` so Vercel builds the React app.

B. Build settings
- Framework Preset: Create React App
- Build Command: `npm run build` (or leave default)
- Output Directory: `build`

C. Environment variables (Vercel > Project > Settings > Environment Variables)
- REACT_APP_API_URL = https://<render-service>/api
- REACT_APP_SOCKET_URL = https://<render-service>  (use wss:// if your client explicitly uses that scheme)

D. Deploy
- Trigger a deploy; once complete you'll get a Vercel URL like https://my-mediconnect.vercel.app
- Update Render's CLIENT_URL to this Vercel URL so CORS and rate-limiting behave correctly.

4) Local testing before deploy (recommended)
--------------------------------------------
A. Backend
- Create a local .env in server/ with MONGO_URI pointing at Atlas and JWT_SECRET; then run:
  cd server
  npm install
  npm run dev
- Confirm `http://localhost:5000/api/health` works (or the PORT you set)

B. Frontend
- In client/.env (or in the local environment) set REACT_APP_API_URL to your running backend (http://localhost:5000/api)
- cd client
  npm install
  npm start
- Log in and exercise the auth + appointments flow locally.

5) Socket.IO / WebRTC notes
---------------------------
- Use the REACT_APP_SOCKET_URL environment variable in the frontend to point Socket.IO to the Render URL.
- For reliable WebRTC connections in production behind NATs, deploy a TURN server (Coturn) or use a commercial service (e.g., Twilio). Configure TURN credentials in server and client as needed.
- Ensure backend only allows socket connections from authenticated users and only for the correct appointment rooms.

6) Security & production checklist
----------------------------------
- Use a strong JWT_SECRET and never commit it.
- Configure Atlas IP allowlist and DB user roles.
- Enable HTTPS — Vercel and Render provide automatic TLS for their domains.
- Consider adding a refresh-token rotation flow and short-lived access tokens.
- For HIPAA-like requirements, add audit logging and restrict data retention.

7) Optional: serve client from backend (single deploy)
-----------------------------------------------------
If you prefer a single deploy (backend serves built client), build the client locally and copy client/build into server/public, then have Express serve static assets. Steps:
- cd client && npm run build
- copy build/ to server/public (or change server to serve from client/build)
- Deploy only server to Render as a single service. Make sure `CLIENT_URL` is set to your domain or omit CORS.

8) Useful env var summary
-------------------------
(Backend — Render)
- MONGO_URI
- JWT_SECRET
- CLIENT_URL
- NODE_ENV=production

(Frontend — Vercel)
- REACT_APP_API_URL
- REACT_APP_SOCKET_URL

9) Troubleshooting
------------------
- 500 / DB errors: check MONGO_URI, username/password, and network access.
- Auth failing: ensure tokens are sent (client should set Authorization: Bearer <token>) and backend verifies JWT using same JWT_SECRET.
- Socket connection errors: browser console will show failed socket handshakes; ensure correct ws/wss URL and that backend supports WebSockets.

-- End of guide --

If you want, I can:
- Add this DEPLOYMENT.md to the repository (done),
- Fix any remaining code issues that block deployment (I detected an axios auth header bug — please confirm client/src/api/axios.js contains `Bearer ${token}`),
- Add a Dockerfile and a server-side static-serving option (single service) if you prefer that route.

Which of these would you like next? (I can add a Dockerfile, create a small production checklist script, or patch other files.)