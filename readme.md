# FeedbackFlow - Employee Feedback Management System

A comprehensive employee feedback management system designed for internal company use, enabling structured feedback sharing between managers and employees with role-based access control.

## 🌐 Live Demo

**Deployed Application**: [https://feedback-flow-8i9p.onrender.com](https://feedback-flow-8i9p.onrender.com)

## 🚀 Features

- **Role-Based Authentication**: Admin, Manager, and Employee access levels
- **Feedback Management**: Create, view, and acknowledge feedback
- **Admin Dashboard**: User management and system-wide feedback tracking
- **Manager Dashboard**: Team management and feedback submission
- **Employee Dashboard**: View received feedback and acknowledgment system
- **Real-time Updates**: Live data synchronization across all dashboards

## 🛠️ Tech Stack

- **Frontend**: React + TypeScript, Vite, TailwindCSS, shadcn/ui
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Session-based with Passport.js
- **State Management**: TanStack Query

## 📋 Prerequisites

- Node.js 20+
- PostgreSQL 14+
- npm or yarn

## 🔧 Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd FeedbackFlow
```

2. **Install dependencies**
```bash
npm install
npm install dotenv
```

3. **Setup PostgreSQL**
```bash
# Install PostgreSQL (macOS)
brew install postgresql@16
brew services start postgresql@16

# Create database
createdb feedbackflow_db
```

4. **Environment Configuration**
Create a `.env` file in the root directory:
```env
DATABASE_URL="postgresql://yourusername@localhost:5432/feedbackflow_db"
PGHOST=localhost
PGPORT=5432
PGUSER=yourusername
PGPASSWORD=
PGDATABASE=feedbackflow_db
SESSION_SECRET="your-32-character-random-string"
NODE_ENV=development
```

Generate session secret:
```bash
openssl rand -hex 32
```

5. **Initialize Database**
```bash
npm run db:push
```

6. **Start Development Server**
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## 👥 Default Login Credentials

### Admin User
- **Username**: `admin1`
- **Password**: `password123`
- **Access**: Full system administration, user role management, organization-wide feedback tracking

### Manager User
- **Username**: `manager1`
- **Password**: `password123`
- **Access**: Team management, feedback submission to employees, feedback history

### Employee Users
- **Username**: `employee1` or `employee2`
- **Password**: `password123`
- **Access**: View received feedback, acknowledge feedback, personal dashboard

## 📱 Usage

### Admin Dashboard
1. Login as `admin1`
2. Navigate to **User Management** tab to modify user roles
3. Switch to **Feedback Tracking** tab to monitor all feedback across the organization
4. View system statistics and user distribution

### Manager Dashboard
1. Login as `manager1`
2. View your team members in the **My Team** section
3. Click **Give Feedback** to submit feedback to employees
4. Monitor feedback history and acknowledgment status

### Employee Dashboard
1. Login as `employee1` or `employee2`
2. View received feedback from managers
3. Acknowledge feedback by clicking the **Acknowledge** button
4. Track your feedback history and response status

## 🗂️ Project Structure

```
FeedbackFlow/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utility functions
├── server/                # Express backend
│   ├── routes.ts          # API routes
│   ├── storage.ts         # Database operations
│   ├── auth.ts           # Authentication logic
│   └── db.ts             # Database configuration
├── shared/               # Shared types and schemas
│   └── schema.ts         # Database schema and types
└── package.json          # Dependencies and scripts
```

## 🔑 Key Features

### Authentication System
- Session-based authentication with secure password hashing
- Role-based access control (Admin, Manager, Employee)
- Automatic session management and logout functionality

### Feedback Management
- Structured feedback forms with strengths and improvements
- Sentiment analysis (positive, neutral, negative)
- Acknowledgment workflow for employees
- Real-time feedback status updates

### Admin Capabilities
- User role management with dynamic assignment
- System-wide feedback monitoring
- User statistics and analytics
- Manager-employee relationship management

## 🚀 Deployment

### Production Build
```bash
npm run build
```

### Database Migration
```bash
npm run db:push
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a pull request

**Note**: This system includes sample data for immediate testing. All default passwords should be changed in production environments.
