
# LuxReplit - Fitness Studio Management System

## Overview
A comprehensive fitness studio management system built with React, Express, and PostgreSQL (via Drizzle ORM). The application supports multiple user roles (Admin, Trainer, Member) with role-specific features and dashboards.

## Features
- 🔐 Role-based authentication and authorization
- 📊 Customized dashboards for admins, trainers, and members
- 👥 Member management and onboarding
- 📅 Training session scheduling and management
- 💰 Billing and invoice management
- 📈 Marketing campaign management
- 🏋️ Exercise library

## Tech Stack
- Frontend: React with TypeScript
- Backend: Express.js
- Database: PostgreSQL with Drizzle ORM
- Authentication: Session-based with Passport.js
- UI: Tailwind CSS with Shadcn UI components

## Getting Started

### Prerequisites
- Node.js
- PostgreSQL database (configured via DATABASE_URL)

### Installation
1. Clone the repository in Replit
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables (required):
   - `DATABASE_URL`: PostgreSQL connection string

### Development
Run the development server:
```bash
npm run dev
```

### Building for Production
```bash
npm run build
```

## Project Structure
```
├── client/          # Frontend React application
├── server/          # Backend Express server
├── shared/          # Shared types and schemas
└── scripts/         # Utility scripts
```

## Contributing
[Contribution guidelines to be added]

## License
[License information to be added]
