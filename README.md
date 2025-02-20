
# LuxReplit - Gym & Personal Training Management Platform

A comprehensive platform for managing gym operations, personal training, and client relationships.

## Core Features
- Member & Client Management
- Training Program Design
- Workout Exercise Library
- Pricing & Package Management
- Secure Authentication
- Role-Based Access Control
- Rate Limiting & Security
- Error Logging & Monitoring

## Tech Stack
- Frontend: React 18 with TypeScript
- Backend: Express.js
- Database: SQLite with Drizzle ORM
- UI: Tailwind CSS + Shadcn UI
- State Management: TanStack Query
- Validation: Zod
- Forms: React Hook Form
- Navigation: Wouter
- Analytics: Recharts

## Setup
1. Fork this template in Replit
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`
4. Access at: `http://0.0.0.0:5000`

## Security Features
- Rate limiting on authentication routes
- Session-based authentication
- Input validation using Zod
- Error boundaries for resilience
- Comprehensive error logging

## API Routes
- `/api/auth/*` - Authentication endpoints
- `/api/members/*` - Member management
- `/api/trainers/*` - Trainer operations
- `/api/workouts/*` - Workout management
- `/api/exercises/*` - Exercise library
- `/api/pricing/*` - Package pricing

## Development
- Organized component architecture
- Type-safe database operations
- Consistent error handling
- Mobile-responsive design
- Real-time updates

For more details on specific features or configuration, check the documentation in the respective directories.
