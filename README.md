┌─────────────────────────────────────────────────────────────────┐
│                      Client Browser                              │
│  • HTML/CSS/JavaScript                                          │
│  • TypeScript Runtime                                           │
│  • Modern Browser APIs                                          │
└───────────────────────┬─────────────────────────────────────────┘
                        ↓ HTTP/WebSocket
┌───────────────────────▼─────────────────────────────────────────┐
│                    Frontend (React + TypeScript)                 │
│  ┌─────────────┐   ┌──────────────┐   ┌────────────────────┐   │
│  │  UI/UX      │   │State Manager │   │ Form Validation    │   │
│  │(Shadcn/UI)  │   │(TanStack)    │   │(React Hook Form)   │   │
│  └─────────────┘   └──────────────┘   └────────────────────┘   │
│  • Component Library   • Query Cache    • Schema Validation     │
│  • Theme System       • Mutations      • Error Handling        │
└───────────────────────┬─────────────────────────────────────────┘
                        ↓ RESTful API
┌───────────────────────▼─────────────────────────────────────────┐
│                   Backend (Express.js)                           │
│  ┌─────────────┐   ┌──────────────┐   ┌────────────────────┐   │
│  │Auth Service │   │API Endpoints │   │ Business Logic     │   │
│  │(Passport.js)│   │(REST)        │   │                    │   │
│  └─────────────┘   └──────────────┘   └────────────────────┘   │
│  • Session Mgmt     • CRUD Routes     • Data Processing        │
│  • JWT Tokens       • Validation      • Business Rules         │
└─────────┬───────────────────┬────────────────────┬─────────────┘
          ↓                   ↓                    ↓
┌─────────▼───────┐ ┌────────▼────────┐ ┌────────▼────────┐
│   PostgreSQL    │ │    OpenAI API   │ │  Google Places  │
│   Database      │ │    (AI/ML)      │ │     API        │
│ • Drizzle ORM   │ │ • Exercise AI   │ │ • Location Data │
│ • Query Builder │ │ • Insights      │ │ • Geocoding     │
└─────────────────┘ └─────────────────┘ └─────────────────┘

Key Features:
- Secure authentication and authorization with Passport.js
- Real-time state management with TanStack Query
- Form validation and error handling with React Hook Form
- Responsive UI components with Shadcn/UI
- RESTful API endpoints with Express.js
- PostgreSQL database with Drizzle ORM for type-safe queries
- AI-powered exercise insights via OpenAI API
- Location services with Google Places API

Technical Stack:
Frontend:
- React with TypeScript for type safety
- TanStack Query for server state management
- Shadcn/UI for consistent design system
- React Hook Form for form handling

Backend:
- Express.js server with TypeScript
- Passport.js for authentication
- Drizzle ORM for database operations
- RESTful API architecture

Database:
- PostgreSQL for data persistence
- Drizzle ORM for type-safe queries
- Connection pooling for performance

External Services:
- OpenAI API for AI/ML capabilities
- Google Places API for location services