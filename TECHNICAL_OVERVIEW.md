# LuxReplit Gym Management Application Technical Overview
Last Updated: February 24, 2025

## Architecture Overview

### Tech Stack
- **Frontend**: React + TypeScript with Vite
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with session-based auth
- **API Layer**: RESTful with Express routes
- **UI Components**: Shadcn/UI + Tailwind CSS
- **State Management**: TanStack Query
- **Form Handling**: React Hook Form + Zod validation
- **Development Environment**: Replit

### Infrastructure Components
1. **Database Layer**
   - PostgreSQL via Neon serverless
   - Connection pooling for scalability
   - Drizzle ORM for type-safe queries
   - Schema migrations via drizzle-kit

2. **API Services**
   - Express.js REST endpoints
   - Role-based access control
   - Session management with PostgreSQL store
   - Rate limiting implementation
   - Error handling middleware

3. **Frontend Architecture**
   - React components with TypeScript
   - TanStack Query for server state
   - Tailwind for styling
   - Responsive design system
   - Component library via Shadcn/UI

### Core Features

1. **Authentication & Authorization**
   - Session-based auth with Passport.js
   - Role-based permissions (admin/trainer/member)
   - Protected route middleware
   - Session persistence in PostgreSQL

2. **Member Management**
   - Profile CRUD operations
   - Membership tracking
   - Progress monitoring
   - Assessment management

3. **Training System**
   - Workout plan creation/management
   - Exercise library
   - Progress tracking
   - Performance analytics

4. **Scheduling**
   - Class management
   - Personal training sessions
   - Availability tracking
   - Booking system

5. **Billing & Payments**
   - Membership pricing
   - Payment processing through Stripe
   - Invoice generation
   - Subscription management

## Database Schema

### Core Tables
1. **Users**
   - Authentication and base user data
   - Role management
   - Profile information

2. **Members**
   - Extended user information
   - Membership status
   - Training preferences
   - Progress tracking

3. **Training**
   - Workout plans
   - Exercise definitions
   - Progress metrics
   - Assessment data

4. **Scheduling**
   - Class schedules
   - Training sessions
   - Availability blocks
   - Booking records

5. **Financial**
   - Payment records
   - Membership pricing
   - Invoice data
   - Subscription tracking

### Key Relationships
- Users ↔ Roles: One-to-many
- Members ↔ Trainers: Many-to-many
- Classes ↔ Members: Many-to-many
- Workouts ↔ Exercises: Many-to-many

## API Structure

### Endpoint Categories
1. **Authentication**
   - Login/logout
   - Session management
   - Password reset
   - Role verification

2. **Member Management**
   - Profile operations
   - Progress tracking
   - Membership status
   - Assessment handling

3. **Training**
   - Workout management
   - Exercise library
   - Progress tracking
   - Performance metrics

4. **Scheduling**
   - Class booking
   - Session management
   - Availability tracking
   - Calendar operations

5. **Billing**
   - Payment processing
   - Invoice generation
   - Subscription handling
   - Price management

## Development Workflow

### Environment Setup
- Node.js runtime
- PostgreSQL database
- NPM dependencies
- Environment variables

### Build Process
- TypeScript compilation
- Vite bundling
- Asset optimization
- Source maps generation

### Deployment Process
- Build verification
- Database migrations
- Static asset deployment
- Service startup

## Security Implementations

### Authentication
- Session-based auth
- Password hashing
- CSRF protection
- Rate limiting

### Data Protection
- Input validation
- SQL injection prevention
- XSS protection
- CORS policies
- Secure payment processing
  - Stripe integration ready
  - Payment intent workflow
  - Customer management system
  - Transaction security

### Access Control
- Role-based permissions
- Resource authorization
- API route protection
- Session management

## Performance Optimizations

### Database
- Connection pooling
- Query optimization
- Index management
- Cache implementation

### Application
- Code splitting
- Asset optimization
- State management
- API response caching

## Monitoring & Logging

### System Logs
- Error tracking
- Performance metrics
- Security events
- User activity

### Analytics
- Usage statistics
- Performance metrics
- Error rates
- User engagement

## Future Enhancements

### Planned Features
- AI workout recommendations
- Advanced analytics dashboard
- Mobile application
- Integration capabilities
- Full Stripe integration
  - Subscription management
  - Automated billing
  - Payment analytics
  - Refund processing

### Technical Debt
- JWT implementation
- Test coverage expansion
- Documentation updates
- Performance optimization

## Development Guidelines

### Code Standards
- TypeScript strict mode
- ESLint configuration
- Prettier formatting
- Component patterns

### Testing Strategy
- Unit tests (Jest)
- Integration tests
- E2E testing
- Performance testing

### Documentation
- API documentation
- Component documentation
- Setup guides
- Deployment procedures