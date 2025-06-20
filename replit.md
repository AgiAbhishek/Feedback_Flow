# FeedbackFlow - Internal Feedback Management System

## Overview

FeedbackFlow is a lightweight feedback management system designed for internal company use, enabling structured feedback sharing between managers and employees. The system features role-based access control, feedback submission and acknowledgment workflows, and clean, modern UI components.

## System Architecture

### Full-Stack Application Structure
- **Frontend**: React with TypeScript, using Vite as the build tool
- **Backend**: Express.js server with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth with OpenID Connect
- **UI Framework**: shadcn/ui components with Tailwind CSS

### Monorepo Structure
The application follows a monorepo pattern with clear separation:
- `client/` - React frontend application
- `server/` - Express.js backend server
- `shared/` - Shared TypeScript types and database schema
- Root-level configuration files for build tools and deployment

## Key Components

### Authentication System
- **Provider**: Traditional username/password authentication with Passport.js Local Strategy
- **Password Security**: Scrypt-based password hashing with salt
- **Session Management**: PostgreSQL-backed sessions using connect-pg-simple
- **Role-based Access**: Two primary roles (manager/employee) with appropriate permissions
- **Security**: HTTP-only cookies, secure session handling, foreign key constraints

### Database Schema
- **Users Table**: Stores user profiles with role assignments and manager relationships
- **Feedback Table**: Stores feedback entries with sentiment analysis and acknowledgment tracking
- **Sessions Table**: Manages user sessions for authentication

### Frontend Architecture
- **Routing**: Client-side routing with wouter
- **State Management**: TanStack Query for server state management
- **UI Components**: Comprehensive shadcn/ui component library
- **Form Handling**: React Hook Form with Zod validation
- **Styling**: Tailwind CSS with custom design tokens

### Backend API Structure
- **Authentication Routes**: Login, logout, and user session management
- **Feedback Routes**: CRUD operations for feedback with role-based authorization
- **Team Routes**: Manager access to team member information

## Data Flow

### Authentication Flow
1. User initiates login through Replit Auth
2. OpenID Connect validates credentials
3. User session created and stored in PostgreSQL
4. Role-based dashboard routing (Manager vs Employee)

### Feedback Creation Flow
1. Manager selects team member from dashboard
2. Structured form submission (strengths, improvements, sentiment)
3. Backend validation and database storage
4. Real-time UI updates via TanStack Query invalidation

### Feedback Acknowledgment Flow
1. Employee views received feedback
2. Acknowledgment action triggers API call
3. Database update with timestamp
4. Manager dashboard reflects acknowledgment status

## External Dependencies

### Core Runtime Dependencies
- **Database**: @neondatabase/serverless for PostgreSQL connectivity
- **ORM**: drizzle-orm with drizzle-kit for migrations
- **Authentication**: openid-client and passport for auth handling
- **UI Library**: Complete Radix UI ecosystem via shadcn/ui
- **State Management**: @tanstack/react-query for server state

### Development Tools
- **Build System**: Vite for frontend, esbuild for backend
- **TypeScript**: Full type safety across frontend and backend
- **Validation**: Zod for runtime type validation
- **Database**: Drizzle Kit for schema management and migrations

## Deployment Strategy

### Replit Platform Integration
- **Environment**: Configured for Node.js 20 with PostgreSQL 16
- **Build Process**: Multi-stage build with frontend and backend compilation
- **Port Configuration**: Express server on port 5000, external port 80
- **Auto-scaling**: Configured for autoscale deployment target

### Production Build
- Frontend assets built to `dist/public/`
- Backend compiled with esbuild to `dist/index.js`
- Static file serving integrated into Express server
- Environment-based configuration for development vs production

### Database Management
- Drizzle schema-first approach with TypeScript definitions
- Migration files generated in `migrations/` directory
- Connection pooling with Neon serverless PostgreSQL
- Session storage directly in database for scalability

## Changelog

```
Changelog:
- June 20, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```