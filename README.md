# Smart Appointment & Queue Management System

A MERN-stack appointment booking application with customer self-service and a staff schedule dashboard. Customers can choose a service and time, look up appointments using their email or phone number, and cancel confirmed bookings. Staff can review appointments, filter the schedule, and complete or cancel bookings.

## Project overview and architecture

- **Frontend:** React 18, React Router, and Vite provide the booking, self-service, and staff dashboard screens.
- **Backend:** Node.js and Express expose a JSON REST API.
- **Persistence:** MongoDB stores services and appointments through Mongoose models. The backend seeds two example services when the service collection is empty.
- **Booking integrity:** A MongoDB compound unique partial index enforces one active (Confirmed or Completed) appointment per date and slot, including when concurrent booking requests arrive.

### Root-level structure

```text
smart-queue-system/
├── backend/
│   ├── models/
│   │   ├── Appointment.js
│   │   └── Service.js
│   ├── server.js
│   ├── package.json
│   └── .env                  # Create locally; do not commit
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   └── package.json
└── README.md
```

The app's API URL is currently set to `http://localhost:5000/api` in the frontend. Run the backend on port `5000` when using the frontend as-is.

## Setup and installation

### Prerequisites

- Node.js and npm
- A MongoDB instance, either local or hosted (for example, MongoDB Atlas)

### 1. Clone the project

Replace `<repository-url>` with the URL for your project repository:

```sh
git clone <repository-url>
cd smart-queue-system
```

### 2. Configure the backend

Create `backend/.env` with your MongoDB connection string:

```dotenv
PORT=5000
TZ=Asia/Kolkata
MONGO_URI=mongodb://127.0.0.1:27017/smart-queue
STAFF_EMAIL=demo@smartqueue.local
STAFF_PASSWORD=replace-with-a-strong-local-password
STAFF_TOKEN_SECRET=replace-with-at-least-32-random-characters
```

For MongoDB Atlas, use the connection URI supplied for your own database instead of the local example. `STAFF_TOKEN_SECRET` must be at least 32 characters and should be generated randomly (for example, `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`). Keep all backend credentials private.

Install the backend dependencies:

```sh
cd backend
npm install
```

Start the API:

```sh
node server.js
```

The API listens on `http://localhost:5000` by default. Keep this terminal open.

### 3. Run the frontend

In a second terminal, install dependencies and start Vite:

```sh
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite (typically `http://localhost:5173`).

## Environment variables

| Variable | Location | Required | Purpose |
|---|---|---:|---|
| `MONGO_URI` | `backend/.env` | Yes | MongoDB connection URI used by Mongoose. |
| `PORT` | `backend/.env` | No | Backend listening port; defaults to `5000`. The frontend currently expects port `5000`. |
| `TZ` | `backend/.env` / hosting environment | Recommended | Set to `Asia/Kolkata` so the Node.js process uses Indian Standard Time. Date-sensitive application logic also explicitly formats dates in this timezone. |
| `STAFF_EMAIL` | `backend/.env` | Yes | Staff login identifier checked by the backend. |
| `STAFF_PASSWORD` | `backend/.env` | Yes | Staff login password checked by the backend. |
| `STAFF_TOKEN_SECRET` | `backend/.env` | Yes | At least 32 random characters used to sign expiring staff tokens. |

Staff credentials are never placed in frontend environment variables. The login endpoint issues a signed bearer token that expires after eight hours. Protect the backend `.env` file and use HTTPS in deployed environments.

## API documentation

Base URL: `http://localhost:5000/api`

| Method and endpoint | Parameters/body | Behavior |
|---|---|---|
| `POST /auth/login` | `{ "email": "...", "password": "..." }` | Checks backend-configured staff credentials and returns a signed bearer token. |
| `GET /services` | None | Returns active service records. |
| `GET /slots?date=YYYY-MM-DD` | Required `date` query parameter | Returns `{ "allSlots": [...], "availableSlots": [...], "bookedSlots": [...] }` for the requested date. The standard schedule contains hourly slots from `09:00` through `16:00`. |
| `POST /appointments` | JSON body described below | Creates an appointment and returns it with HTTP `201`. A slot already occupied by a Confirmed or Completed appointment returns HTTP `409`. |
| `GET /appointments/lookup?contact=...` | Required customer email or phone in `contact` | Public customer lookup; returns only matching appointments with the service populated. |
| `PATCH /appointments/:id/cancel` | `{ "contact": "..." }` | Public self-service cancellation; the supplied contact must match the appointment. Only Confirmed appointments can be cancelled. |
| `GET /appointments` | Optional `date` and `status` query parameters; `Authorization: Bearer <token>` required | Staff-only schedule query, sorted by slot, with the related service populated. |
| `PATCH /appointments/:id/status` | `{ "status": "Cancelled" \| "Completed" }`; bearer token required | Staff-only transition from Confirmed to Cancelled or Completed. Cancelled and Completed are terminal. |

Example appointment request:

```json
{
  "serviceId": "SERVICE_OBJECT_ID",
  "customerName": "Alex Customer",
  "customerPhone": "5550101234",
  "customerEmail": "alex@example.com",
  "date": "2026-11-02",
  "slot": "10:00",
  "description": "Optional notes",
  "durationMinutes": 30
}
```

Required fields are `serviceId`, `customerName`, `customerPhone`, `date`, and `slot`. Email, notes, and duration are optional.

Staff login is performed by sending credentials to `POST /auth/login`, then including the returned token as `Authorization: Bearer <token>` on staff requests. Tokens expire after eight hours.

Customer lookup is performed on the server and returns only records matching the supplied email or phone. Customer cancellation uses a separate endpoint, so it remains available without exposing or granting access to the staff-only status endpoint.

Status changes use a strict state machine: Confirmed appointments may become Cancelled or Completed; Cancelled and Completed appointments cannot transition further. Illegal transitions return HTTP `400`.

## Problem-solving and edge-case decisions

1. **Concurrent booking protection:** The appointment model declares a unique compound index on `{ date, slot }`, limited to `Confirmed` and `Completed` records. MongoDB enforces this atomically, so competing bookings cannot both claim the same active slot. The API translates the duplicate-key error into HTTP `409`.
2. **Stale availability:** The slot list is fetched for the selected date, but the server-side database constraint is authoritative when a booking is saved. If another customer takes the slot after it was displayed, the booking receives `409`, the UI shows the conflict, and the available slots are fetched again.
3. **Cancellation and slot reuse:** Cancelled appointments are excluded from the slot availability query and from the partial unique index. Cancelling therefore frees the date/slot for another booking.
4. **Invalid state changes:** Staff status changes are authenticated and restricted to Confirmed → Cancelled or Confirmed → Completed. Cancelled and Completed are terminal states; other transitions return HTTP `400`.
5. **API failure recovery and loading feedback:** Booking submission displays a progress label and disables its submit button while the request is in flight. Booking and slot-fetch failures are surfaced in the booking UI, and a slot conflict triggers a refresh. The lookup and dashboard screens also show request errors. Loading indicators/disabled controls are not implemented uniformly for every request on those screens.
6. **Duplicate submission prevention:** The booking form requires a selected slot and disables the confirmation button while the appointment request is pending, preventing repeated booking submissions through that control.

## Demo staff dashboard access

For a local demo, set `STAFF_EMAIL`, `STAFF_PASSWORD`, and `STAFF_TOKEN_SECRET` in `backend/.env`. Enter the configured email and password at **Dashboard → Staff Login**. The example values in the setup section are for local demonstration only; use a strong password and random signing secret outside a demo.

Never put staff credentials or signing secrets in `frontend/.env` or variables prefixed with `VITE_`.
Remove any legacy `VITE_DASHBOARD_EMAIL` and `VITE_DASHBOARD_PASSWORD` entries from `frontend/.env`; the frontend no longer reads them.

## Validation commands

From `frontend/`, you can run the configured checks:

```sh
npm run lint
npm run build
```

The backend package does not currently define a test runner or start script; run it with `node server.js`.
