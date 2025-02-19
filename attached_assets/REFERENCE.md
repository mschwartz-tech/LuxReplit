# Fitness Studio Admin App Reference

## Project Goal
Build a standalone app integrating core features from Trainerize, Digigrowth, and GymMaster, modernized for 2025 with a focus on user-friendliness for members, trainers, and admins.

## Core Features
- **Member Management**: Unified profiles, access control, AI-driven retention.
- **Training**: Customizable plans, progress tracking, AI adjustments.
- **Scheduling**: Trainer availability, member bookings, group classes, recurring slots, session types, waitlists, cancellations, calendar integration, reporting.
- **Billing**: Usage-based billing, secure payments.
- **Marketing**: Automated campaigns, analytics, AI insights.
- **Communication**: Threaded messaging, automated notifications.
- **Reporting**: Gym performance, attendance, trainer utilization.

## Modern Technologies
- AI/ML for personalization and analytics.
- Wearable integration for health data.
- VR/AR for immersive experiences.
- Blockchain for secure payments.

## User Experience
- Intuitive, responsive design with personalized dashboards for admins, trainers, and members.

## Security and Privacy
- Encrypted data via bcrypt (passwords), secure authentication with Passport.js, GDPR/CCPA compliance in progress.

## Scalability
- Cloud-based backend with microservices using Node.js, Express, and MongoDB.

## Current State (February 18, 2025)
- **Files**: 
  - Frontend: `index.html`, `script.js`, `styles.css`
  - Backend: `backend/app.js`, `backend/models/User.js`, `backend/models/Member.js`, `backend/models/Gym.js`, `backend/routes/auth.js`, `backend/routes/members.js`, `backend/config/database.js`, `backend/package.json`
- **Dependencies**: 
  - Frontend: Font Awesome 5.15.4 CDN
  - Backend: Express.js, Mongoose, Passport.js, bcryptjs, body-parser, cors
- **Login**: Secure authentication with Passport.js (local strategy), session-based with cookies.
- **Sections**:
  - **Dashboard**: Role-specific welcome message (admin, trainer, member); metrics pending.
  - **Members**: CRUD operations via `/api/members` for admins; placeholders for trainer and member views.
  - **Billing**: Placeholder section for admins.
  - **Training**: Placeholder section for admins; trainer and member subsections pending.
  - **Marketing**: Placeholder section for admins.
  - **Settings**: Profile update form for all roles (backend endpoint pending).
  - **Trainer Dashboard**: Placeholder with sections (My Members, My Schedule).
  - **Member Dashboard**: Placeholder with sections (My Plans, Book Session).
- **Data**: MongoDB with Mongoose models (`User`, `Member`, `Gym`); `localStorage` fully replaced.

## Implemented Features
- **Backend**:
  - Secure user authentication with roles (admin, trainer, member) via `/api/auth/login` and `/api/auth/logout`.
  - API endpoints for member management (`/api/members` GET, POST, DELETE).
  - MongoDB connection and schemas for `User`, `Member`, and `Gym`.
- **Frontend**:
  - Role-based navigation and section visibility (admin, trainer, member).
  - Login/logout integration with backend API.
  - Member management with API-driven CRUD operations.
  - Settings form with profile update placeholder.
  - Basic error handling for API calls.

## To-Do List
- **Backend**:
  - Implement additional API endpoints:
    - `/api/users/me` (GET, PUT) for profile management.
    - `/api/invoices` (GET, POST, PUT, DELETE) for billing.
    - `/api/scheduling` (GET, POST, PUT, DELETE) for trainer availability, bookings, and group classes.
    - `/api/workout-plans` (GET, POST, PUT, DELETE) for training plans.
    - `/api/campaigns` (GET, POST, PUT, DELETE) for marketing.
    - `/api/dashboard` (GET) for role-specific metrics.
  - Add role-based access control (RBAC) middleware for API routes.
  - Integrate calendar APIs (e.g., Google Calendar).
  - Enhance security with JWT tokens, HTTPS, and rate limiting.
  - Write unit tests for API endpoints (e.g., using Jest).
- **Frontend**:
  - Complete dashboard with metrics (active members, revenue, campaigns, workouts) via `/api/dashboard`.
  - Implement billing section with invoice CRUD operations.
  - Fully develop training section:
    - Admin: Manage all plans and schedules.
    - Trainer: My Members (CRUD for assigned members), My Schedule (availability and bookings).
    - Member: My Plans (view plans), Book Session (schedule with trainers).
  - Implement marketing section with campaign management.
  - Enhance settings with theme selection and additional options.
  - Add responsive design improvements in `styles.css`.
- **General**:
  - Migrate existing `localStorage` data (e.g., trainers, gyms) to MongoDB via an import script.
  - Integrate AI-driven features (e.g., retention predictions, workout adjustments).
  - Explore VR/AR and blockchain implementations.

## Next Task
- **Backend**: Add `/api/scheduling` endpoints to support trainer availability, bookings, and group classes with multi-gym functionality.
- **Frontend**: Implement the Training section fully, leveraging the new scheduling API for admin, trainer, and member views.

## Notes
- **Testing**: Create test users in MongoDB (e.g., `{ username: "admin", password: "password123", role: "admin" }`) via a temporary `/api/auth/register` route or direct insertion.
- **Setup**: Ensure MongoDB is running locally or update the connection string in `backend/config/database.js`.
- **Future**: Plan for trainer-specific dashboards to manage assigned members across gyms once scheduling is complete.