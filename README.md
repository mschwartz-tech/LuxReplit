
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

## Configuration

### Environment Variables
Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secret for session management
- `OPENAI_API_KEY`: OpenAI API key for AI features
- `RATE_LIMIT_WINDOW`: Rate limiting window in minutes (default: 15)
- `RATE_LIMIT_MAX`: Maximum requests per window (default: 100)

Set these using Replit's Secrets manager in the Tools panel.

### Application Configuration
- `server/middleware/rate-limit.ts`: Customize rate limiting settings
- `server/middleware/cache.ts`: Configure caching behavior
- `shared/schema.ts`: Database schema definitions
- `theme.json`: UI theme customization

## Deployment
1. Push changes to your Repl
2. Open the "Deployment" tab in Replit
3. Click "Deploy" to publish your changes

The deployment process will:
- Build the frontend assets
- Bundle the server code
- Start the production server

### Production Considerations
- Enable rate limiting for API endpoints
- Configure proper session storage
- Set up error logging and monitoring
- Use production database credentials

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

## Logging
Logs are stored in the `logs` directory:
- `combined.log`: All application logs
- `error.log`: Error-level logs only

For detailed logging configuration, see `server/services/logger.ts`.

## Contributing
1. Fork the project in Replit
2. Create a new branch for your feature
3. Make your changes
4. Test thoroughly
5. Submit a pull request

For more details on specific features or configuration, check the documentation in the respective directories.
