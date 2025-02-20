# LuxReplit - Comprehensive Gym Management Platform

A full-featured gym and personal training management platform built with modern web technologies.

## Tech Stack
- Frontend: React with TypeScript
- Backend: Express.js
- Database: PostgreSQL with Drizzle ORM
- Authentication: Session-based with Passport.js
- UI: Tailwind CSS with Shadcn UI
- Mobile: React Native (planned)

## Setup
1. Fork this template in Replit
2. Set up environment variables in Secrets:
   - `DATABASE_URL`: PostgreSQL connection string
   - `SESSION_SECRET`: Secret for session management
   - `OPENAI_API_KEY`: For AI-powered features (optional)
3. Install dependencies: `npm install`
4. Initialize database: `npm run db:push`
5. Start development server: `npm run dev`

## Key Routes
- `/auth`: Authentication endpoints (login, register, logout)
- `/api/members`: Member management
- `/api/trainers`: Trainer operations
- `/api/workouts`: Workout plan management
- `/api/billing`: Payment processing

## Usage
- Access the app at `0.0.0.0:3000`
- Default admin credentials: admin@example.com / admin123
- Member portal: Register or login as a member
- Trainer dashboard: Access client management
- Admin panel: Full facility management

## Development