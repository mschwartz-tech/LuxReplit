graph TD
    A[Client Browser] -->|HTTP/WebSocket| B[Frontend React + TypeScript]
    B -->|RESTful API| C[Backend Express.js]
    C -->|Query/Mutation| D[PostgreSQL Database]
    C -->|AI Integration| E[OpenAI API]
    C -->|Location Services| F[Google Places API]

    subgraph Frontend[Frontend Layer]
        B --> B1[UI/UX - Shadcn/UI]
        B --> B2[State - TanStack Query]
        B --> B3[Forms - React Hook Form]
    end

    subgraph Backend[Backend Layer]
        C --> C1[Auth - Passport.js]
        C --> C2[ORM - Drizzle]
        C --> C3[Business Logic]
    end