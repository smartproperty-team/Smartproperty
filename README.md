# SmartProperty

## Property Management and Rental Matching Platform
Developed at Esprit School of Engineering – Tunisia 2026

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-In%20Development-yellow.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Goals](#goals)
- [Main Features](#main-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running the Application](#running-the-application)
- [Available Scripts](#available-scripts)
- [Development Guidelines](#development-guidelines)
- [Troubleshooting](#troubleshooting)
- [License](#license)
- [Team & Maintainers](#team--maintainers)
- [Contact](#contact)
- [Project Status](#project-status)

---

## 📖 Overview

**SmartProperty** is a comprehensive, monolithic SaaS platform designed to revolutionize property management and rental matching. The platform connects property owners, managers, and tenants through an intelligent, AI-powered system that streamlines the entire property rental lifecycle.

Our platform provides end-to-end solutions for:

- **Property Owners**: Simplified property listing and management
- **Property Managers**: Comprehensive tools for managing multiple properties and tenants
- **Tenants**: Smart property search and seamless rental application processes
- **AI Integration**: Machine learning-powered property matching and price recommendations

---

## 🎯 Goals

SmartProperty aims to:

1. **Simplify Property Management**: Provide an intuitive interface for managing properties, tenants, and rental agreements
2. **Enhance Rental Matching**: Use AI algorithms to match tenants with their ideal properties based on preferences and requirements
3. **Automate Workflows**: Reduce manual tasks through intelligent automation of routine property management activities
4. **Improve Communication**: Facilitate seamless communication between all stakeholders
5. **Data-Driven Insights**: Provide analytics and insights for better decision-making
6. **Scalability**: Build a robust, scalable platform that can grow with user demand
7. **Security**: Ensure data privacy and security for all users

---

## ✨ Main Features

### For Property Owners/Managers

- 📝 **Property Listing Management**: Create, edit, and manage property listings with rich media support
- 📊 **Dashboard Analytics**: Real-time insights into property performance, occupancy rates, and revenue
- 💰 **Financial Management**: Track rent payments, expenses, and generate financial reports
- 🔔 **Notifications**: Automated alerts for maintenance requests, payment reminders, and lease renewals
- 📄 **Document Management**: Store and manage lease agreements, tenant documents, and property certificates

### For Tenants

- 🔍 **Smart Property Search**: AI-powered search with advanced filters and recommendations
- ⭐ **Property Comparison**: Side-by-side comparison of multiple properties
- 📱 **Application Management**: Submit rental applications and track their status
- 💬 **Direct Communication**: Chat with property owners and managers
- 🏠 **Virtual Tours**: Access 360° virtual property tours

### AI-Powered Features (Planned)

- 🤖 **Intelligent Matching**: ML algorithms to match tenants with suitable properties
- 💵 **Price Prediction**: AI-based rental price recommendations
- 📈 **Market Analysis**: Predictive analytics for rental market trends
- 🎯 **Personalized Recommendations**: Tailored property suggestions based on user behavior

---

## 🛠 Tech Stack

### Frontend

- **Framework**: [React](https://reactjs.org/) - A JavaScript library for building user interfaces
- **Build Tool**: [Vite](https://vitejs.dev/) - Next-generation frontend tooling
- **Language**: [TypeScript](https://www.typescriptlang.org/) - Typed superset of JavaScript
- **Styling**: [TailwindCSS](https://tailwindcss.com/) - Utility-first CSS framework
- **State Management**: Redux Toolkit / Zustand
- **Form Handling**: React Hook Form
- **HTTP Client**: Axios
- **Routing**: React Router

### Backend

- **Framework**: [NestJS](https://nestjs.com/) - Progressive Node.js framework
- **Language**: TypeScript
- **ORM**: [TypeORM](https://typeorm.io/) - TypeScript-first ORM with MongoDB support
- **Database**: [MongoDB](https://www.mongodb.com/) - NoSQL document database
- **Cache**: [Redis](https://redis.io/) - In-memory data structure store
- **Queue**: [Bull](https://github.com/OptimalBits/bull) - Redis-based queue for background jobs
- **Authentication**: JWT (JSON Web Tokens) with Passport.js
- **Validation**: class-validator & class-transformer
- **API Documentation**: Swagger/OpenAPI
- **Rate Limiting**: @nestjs/throttler

### AI Services (Planned)

- **Language**: Python
- **ML Framework**: TensorFlow / PyTorch
- **Data Processing**: Pandas, NumPy
- **API Framework**: FastAPI
- **Services**:
  - Property recommendation engine
  - Price prediction model
  - Image classification for property photos
  - Natural language processing for search

### DevOps & Tools

- **Version Control**: Git & GitHub
- **Containerization**: Docker & Docker Compose
- **CI/CD**: GitHub Actions
- **Testing**: Jest, React Testing Library, Supertest
- **Code Quality**: ESLint, Prettier
- **API Testing**: Postman / Insomnia

---

## 📁 Project Structure

```
smartproperty/
├── frontend/                      # React + Vite frontend application
│   ├── public/                    # Static assets
│   ├── src/
│   │   ├── assets/               # Images, fonts, etc.
│   │   ├── components/           # Reusable React components
│   │   │   ├── common/          # Common UI components
│   │   │   ├── layout/          # Layout components
│   │   │   └── features/        # Feature-specific components
│   │   ├── pages/               # Page components
│   │   ├── hooks/               # Custom React hooks
│   │   ├── services/            # API service functions
│   │   ├── store/               # State management
│   │   ├── types/               # TypeScript type definitions
│   │   ├── utils/               # Utility functions
│   │   ├── styles/              # Global styles
│   │   ├── App.tsx              # Main App component
│   │   └── main.tsx             # Application entry point
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── .env.example
│
├── backend/                       # NestJS backend application
│   ├── src/
│   │   ├── modules/              # Feature modules
│   │   │   ├── auth/            # Authentication module
│   │   │   ├── users/           # User management
│   │   │   ├── properties/      # Property management
│   │   │   ├── tenants/         # Tenant management
│   │   │   ├── applications/    # Rental applications
│   │   │   ├── payments/        # Payment processing
│   │   │   └── notifications/   # Notification system
│   │   ├── common/              # Shared utilities
│   │   │   ├── decorators/      # Custom decorators
│   │   │   ├── filters/         # Exception filters
│   │   │   ├── guards/          # Auth guards
│   │   │   ├── interceptors/    # HTTP interceptors
│   │   │   └── pipes/           # Validation pipes
│   │   ├── config/              # Configuration files
│   │   ├── database/            # Database configuration
│   │   │   ├── migrations/      # Database migrations
│   │   │   └── seeds/           # Database seeders
│   │   ├── main.ts              # Application entry point
│   │   └── app.module.ts        # Root module
│   ├── test/                     # E2E tests
│   ├── package.json
│   ├── tsconfig.json
│   ├── nest-cli.json
│   └── .env.example
│
├── ai-services/                   # Python AI microservices (Planned)
│   ├── recommendation/           # Property recommendation service
│   ├── pricing/                  # Price prediction service
│   ├── image-analysis/           # Image classification service
│   ├── nlp-search/              # NLP-based search service
│   ├── requirements.txt
│   └── docker-compose.yml
│
├── shared/                        # Shared code between frontend and backend
│   ├── types/                    # Shared TypeScript types
│   └── constants/                # Shared constants
│
├── docs/                          # Documentation
│   ├── api/                      # API documentation
│   ├── architecture/             # Architecture diagrams
│   └── guides/                   # Development guides
│
├── scripts/                       # Utility scripts
│   ├── setup.sh                  # Initial setup script
│   └── seed-data.sh             # Database seeding script
│
├── docker-compose.yml            # Docker compose for local development
├── .gitignore
├── .prettierrc
├── .eslintrc.js
├── LICENSE
└── README.md
```

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed on your system:

### Required

- **Node.js** (v18.x or higher) - [Download](https://nodejs.org/)
- **npm** (v9.x or higher) or **yarn** (v1.22.x or higher)
- **Docker Desktop** - [Download](https://www.docker.com/products/docker-desktop) (for MongoDB, Redis, and other services)
- **Git** - [Download](https://git-scm.com/downloads)

### Optional (for AI services)

- **Python** (v3.10 or higher) - [Download](https://www.python.org/downloads/)
- **pip** (v22.x or higher)

### Recommended Tools

- **VS Code** - Code editor with excellent TypeScript support
- **Postman** or **Insomnia** - API testing
- **Mongo Express** - MongoDB GUI (included in Docker setup, accessible at http://localhost:8081)
- **Redis Commander** - Redis GUI (included in Docker setup, accessible at http://localhost:8082)

---

## 🚀 Installation

Follow these steps to set up the SmartProperty platform on your local machine:

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/smartproperty.git
cd smartproperty
```

### 2. Start Docker Services

Make sure Docker Desktop is running, then start all services:

```bash
# From project root
docker-compose up -d
```

This will start:

- **MongoDB** (port 27017) - NoSQL database
- **Mongo Express** (port 8081) - MongoDB admin UI
- **Redis** (port 6379) - Caching and queues
- **Redis Commander** (port 8082) - Redis admin UI
- **MailHog** (ports 1025, 8025) - Email testing

**Mongo Express Credentials:**

- Username: `admin`
- Password: `admin123`

### 3. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# The .env file should already exist, but verify it has:
# - MongoDB connection string
# - Redis configuration
# - JWT secrets
```

**Example `.env` configuration (already created):**

```env
# Application
NODE_ENV=development
PORT=3000
API_PREFIX=api
CORS_ORIGIN=http://localhost:5173

# MongoDB
MONGODB_URI=mongodb://smartproperty:smartproperty123@localhost:27017/smartproperty?authSource=admin

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=smartproperty_redis_secret

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_REFRESH_EXPIRES_IN=30d

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100
```

### 4. Frontend Setup

```bash
# Navigate to frontend directory (from project root)
cd frontend

# Install dependencies
npm install
```

**Frontend `.env` configuration:**

```env
# API Configuration - Use relative path for Vite proxy
VITE_API_URL=/api
VITE_API_GRAPHQL_URL=/graphql

# App Configuration
VITE_APP_NAME=SmartProperty
VITE_APP_VERSION=1.0.0

# Mapbox Configuration (for maps)
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_access_token_here
```

### 5. Quick Setup (Alternative)

You can also install all dependencies at once from the project root:

```bash
# From project root - installs all dependencies
npm run install:all
```

---

## 🏃 Running the Application

### Development Mode

**1. Ensure Docker services are running:**

```bash
docker-compose up -d
```

**2. Run Backend:**

```bash
cd backend
npm run start:dev
```

The backend API will be available at `http://localhost:3000`
Swagger documentation: `http://localhost:3000/api/docs`

**Run Frontend:**

```bash
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:5173`

**Run Both Concurrently:**

```bash
# From project root, if you have a concurrent script setup
npm run dev
```

### Production Mode

**Build Backend:**

```bash
cd backend
npm run build
npm run start:prod
```

**Build Frontend:**

```bash
cd frontend
npm run build
npm run preview  # Preview production build locally
```

### Docker Deployment

```bash
# Build and run all services
docker-compose up --build

# Run in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

---

## 🌐 Development Services & URLs

When running locally, the following services are available:


| Service             | URL                              | Description                       |
| ------------------- | -------------------------------- | --------------------------------- |
| **Backend API**     | http://localhost:3000            | NestJS REST API                   |
| **Swagger Docs**    | http://localhost:3000/api/docs   | Interactive API documentation     |
| **Health Check**    | http://localhost:3000/api/health | API health status                 |
| **Frontend**        | http://localhost:5173            | React development server          |
| **Mongo Express**   | http://localhost:8081            | MongoDB admin UI (admin/admin123) |
| **Redis Commander** | http://localhost:8082            | Redis admin UI                    |
| **MailHog**         | http://cd balocalhost:8025       | Email testing UI                  |

### Docker Container Ports


| Container       | Internal Port | External Port |
| --------------- | ------------- | ------------- |
| MongoDB         | 27017         | 27017         |
| Redis           | 6379          | 6379          |
| Mongo Express   | 8081          | 8081          |
| Redis Commander | 8081          | 8082          |
| MailHog SMTP    | 1025          | 1025          |
| MailHog Web     | 8025          | 8025          |

---

## 📜 Available Scripts

### Backend Scripts


| Script                       | Description                                               |
| ---------------------------- | --------------------------------------------------------- |
| `npm run start`              | Start the application in production mode                  |
| `npm run start:dev`          | Start the application in development mode with hot-reload |
| `npm run start:debug`        | Start the application in debug mode                       |
| `npm run build`              | Build the application for production                      |
| `npm run test`               | Run unit tests                                            |
| `npm run test:watch`         | Run tests in watch mode                                   |
| `npm run test:cov`           | Run tests with coverage report                            |
| `npm run test:e2e`           | Run end-to-end tests                                      |
| `npm run lint`               | Lint the codebase using ESLint                            |
| `npm run format`             | Format code using Prettier                                |
| `npm run migration:generate` | Generate a new migration based on entity changes          |
| `npm run migration:run`      | Run pending migrations                                    |
| `npm run migration:revert`   | Revert the last migration                                 |
| `npm run seed`               | Seed the database with initial data                       |

### Frontend Scripts


| Script                  | Description                              |
| ----------------------- | ---------------------------------------- |
| `npm run dev`           | Start development server with hot-reload |
| `npm run build`         | Build for production                     |
| `npm run preview`       | Preview production build locally         |
| `npm run test`          | Run tests with Vitest                    |
| `npm run test:ui`       | Run tests with UI                        |
| `npm run test:coverage` | Run tests with coverage                  |
| `npm run lint`          | Lint code with ESLint                    |
| `npm run format`        | Format code with Prettier                |
| `npm run type-check`    | Run TypeScript type checking             |

---

## 👨‍💻 Development Guidelines

### Branching Strategy

We follow a **Git Flow** branching model:

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - New features (e.g., `feature/property-search`)
- `bugfix/*` - Bug fixes (e.g., `bugfix/login-error`)
- `hotfix/*` - Critical production fixes (e.g., `hotfix/security-patch`)
- `release/*` - Release preparation (e.g., `release/v1.0.0`)

**Creating a new feature branch:**

```bash
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name
```

### Commit Message Convention

We use **Conventional Commits** for clear and standardized commit messages:

**Format:**

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `ci`: CI/CD changes

**Examples:**

```
feat(properties): add property search with filters

fix(auth): resolve JWT token expiration issue

docs(readme): update installation instructions

refactor(users): simplify user validation logic
```

### Code Style

**TypeScript/JavaScript:**

- Use **ESLint** for linting
- Use **Prettier** for formatting
- Follow **Airbnb Style Guide** principles
- Prefer `const` over `let`, avoid `var`
- Use arrow functions for callbacks
- Use async/await over promises chains

**React:**

- Use functional components with hooks
- Keep components small and focused
- Use TypeScript for prop types
- Follow component file structure:
  ```typescript
  // 1. Imports
  // 2. Types/Interfaces
  // 3. Component
  // 4. Styles (if not using Tailwind)
  // 5. Export
  ```

**NestJS:**

- Use dependency injection
- Follow module-based architecture
- Implement DTOs for validation
- Use guards for authentication/authorization
- Document APIs with Swagger decorators

### Testing

**Unit Tests:**

- Test files should be co-located with source files: `component.spec.tsx`
- Aim for >80% code coverage
- Use descriptive test names: `should return user when valid ID is provided`

**E2E Tests:**

- Test critical user flows
- Use realistic test data
- Clean up test data after tests

**Running Tests:**

```bash
# Backend
cd backend
npm run test              # Unit tests
npm run test:e2e         # E2E tests
npm run test:cov         # With coverage

# Frontend
cd frontend
npm run test             # Unit tests
npm run test:coverage    # With coverage
```

### Code Review Process

1. Create a pull request from your feature branch to `develop`
2. Fill out the PR template with:
   - Description of changes
   - Related issue numbers
   - Screenshots (for UI changes)
   - Testing performed
3. Request review from at least one team member
4. Address review comments
5. Ensure CI/CD checks pass
6. Merge after approval

### Environment Variables

- Never commit `.env` files
- Keep `.env.example` updated with new variables
- Document all environment variables in this README
- Use different values for development, staging, and production

---

## 🐛 Troubleshooting

### Common Issues and Solutions

#### 1. Database Connection Failed

**Error:** `Unable to connect to the database`

**Solutions:**

- Verify PostgreSQL is running: `pg_isready`
- Check database credentials in `.env`
- Ensure database exists: `psql -l | grep smartproperty`
- Check PostgreSQL logs: `tail -f /usr/local/var/log/postgres.log` (macOS)

```bash
# Restart PostgreSQL
brew services restart postgresql  # macOS
sudo service postgresql restart   # Linux
```

#### 2. Redis Connection Error

**Error:** `Error connecting to Redis`

**Solutions:**

- Check if Redis is running: `redis-cli ping` (should return `PONG`)
- Verify Redis configuration in `.env`
- Start Redis: `redis-server`

```bash
# Using Docker
docker start smartproperty-redis

# Or install and start locally
brew services start redis  # macOS
sudo service redis start   # Linux
```

#### 3. Port Already in Use

**Error:** `Port 3000 is already in use`

**Solutions:**

```bash
# Find process using port
lsof -ti:3000  # Get PID
kill -9 <PID>  # Kill process

# Or use a different port in .env
PORT=3001
```

#### 4. npm Install Failures

**Error:** `npm ERR! code ERESOLVE`

**Solutions:**

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install

# Use legacy peer deps if needed
npm install --legacy-peer-deps
```

#### 5. TypeScript Compilation Errors

**Error:** `Type errors in imported modules`

**Solutions:**

```bash
# Clear TypeScript cache
rm -rf node_modules/.cache

# Rebuild TypeScript
npm run build

# Check tsconfig.json for correct paths
```

#### 6. Frontend Build Fails

**Error:** `Build failed with Vite`

**Solutions:**

```bash
# Clear Vite cache
rm -rf node_modules/.vite

# Check for environment variable issues
cat .env

# Rebuild
npm run build
```

#### 7. Migration Issues

**Error:** `Migration failed`

**Solutions:**

```bash
# Revert last migration
npm run migration:revert

# Check database state
psql smartproperty -c "\dt"

# Re-run migrations
npm run migration:run
```

#### 8. CORS Issues

**Error:** `CORS policy: No 'Access-Control-Allow-Origin' header`

**Solutions:**

- Check `CORS_ORIGIN` in backend `.env`
- Ensure frontend URL matches: `http://localhost:5173`
- Verify CORS middleware configuration in `main.ts`

#### 9. JWT Authentication Fails

**Error:** `Unauthorized` or `Invalid token`

**Solutions:**

- Check `JWT_SECRET` in `.env` matches between environments
- Verify token hasn't expired
- Clear browser localStorage/cookies
- Check token format in requests: `Authorization: Bearer <token>`

#### 10. File Upload Issues

**Error:** `File upload failed`

**Solutions:**

- Check `MAX_FILE_SIZE` in `.env`
- Verify `UPLOAD_DIR` exists and has write permissions
- Check disk space: `df -h`
- Verify file type is allowed

### Getting Help

If you encounter issues not covered here:

1. Check existing [GitHub Issues](https://github.com/waeldaagi/examanspring/issues)
2. Search [Stack Overflow](https://stackoverflow.com/) with relevant tags
3. Review framework documentation:
   - [NestJS Docs](https://docs.nestjs.com/)
   - [React Docs](https://react.dev/)
   - [Vite Docs](https://vitejs.dev/)
4. Contact the team (see [Contact](#contact) section)

---

## 📄 License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2026 SmartProperty Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

See the [LICENSE](LICENSE) file for more details.

---

## 👥 Team & Maintainers

### Core Team

**Project Lead & Architecture**

- **Name**: TBD
- **Role**: Technical Lead & System Architect
- **GitHub**: [@username](https://github.com/username)

**Backend Development**

- **Name**: TBD
- **Role**: Backend Lead (NestJS, PostgreSQL, Redis)
- **GitHub**: [@username](https://github.com/username)

**Frontend Development**

- **Name**: TBD
- **Role**: Frontend Lead (React, TypeScript, TailwindCSS)
- **GitHub**: [@username](https://github.com/username)

**AI/ML Engineering**

- **Name**: TBD
- **Role**: AI/ML Engineer (Python, TensorFlow)
- **GitHub**: [@username](https://github.com/username)

**DevOps & Infrastructure**

- **Name**: TBD
- **Role**: DevOps Engineer
- **GitHub**: [@username](https://github.com/username)

### Contributors

We welcome contributions from the community! See our [Contributing Guide](CONTRIBUTING.md) for details on how to get started.

### Acknowledgments

Special thanks to:

- All our contributors and supporters
- The open-source community
- Framework and library maintainers

---

## 📧 Contact

### Support

For support, questions, or feedback:

- **Email**: support@smartproperty.com
- **GitHub Issues**: [Create an issue](https://github.com/waeldaagi/examanspring/issues)
- **Discussions**: [GitHub Discussions](https://github.com/waeldaagi/examanspring/discussions)

### Business Inquiries

For partnership or business inquiries:

- **Email**: business@smartproperty.com

### Social Media

- **Twitter**: [@SmartProperty](https://twitter.com/smartproperty)
- **LinkedIn**: [SmartProperty](https://linkedin.com/company/smartproperty)
- **Website**: [www.smartproperty.com](https://www.smartproperty.com)

---

## 📊 Project Status

### Current Version: 1.0.0-alpha

**Development Status**: 🔄 Phase 2 - Authentication Complete | Phase 3 In Progress

### Current Progress (February 2026)

#### ✅ Completed Features

**Phase 1: Environment & Infrastructure**

- [X]  Monorepo setup with npm workspaces
- [X]  Docker Compose configuration for local development
  - MongoDB (port 27017)
  - Redis (port 6379)
  - Mongo Express (port 8081)
  - Redis Commander (port 8082)
  - MailHog for email testing (ports 1025/8025)
- [X]  Backend NestJS configuration with TypeORM
- [X]  Frontend React + Vite + TypeScript setup
- [X]  TailwindCSS styling configuration
- [X]  Environment variables configuration

**Phase 2: Authentication System (Complete)**

- [X]  User registration with email verification
- [X]  Login with JWT access/refresh tokens
- [X]  Password hashing with bcrypt
- [X]  Account lockout after failed attempts
- [X]  Email verification flow
- [X]  Forgot password / Reset password
- [X]  Change password functionality
- [X]  Protected routes with JWT guards
- [X]  Role-based access control (admin, owner, tenant, manager, agent)
- [X]  Refresh token rotation
- [X]  Session management with device tracking
- [X]  Multi-device session support (max 5 sessions)
- [X]  Session revocation (single & all devices)
- [X]  Password history (prevent reuse of last 5)

**Frontend Authentication UI (Complete)**

- [X]  Login page with form validation
- [X]  Registration page with password requirements
- [X]  Forgot password page
- [X]  Reset password page
- [X]  Email verification page with auto-redirect
- [X]  Dashboard with user profile and email verification status
- [X]  Sessions management page (view/revoke sessions)
- [X]  Protected routes component
- [X]  Zustand state management with localStorage persistence
- [X]  Axios API client with token refresh interceptors
- [X]  UI components (Button, Input, Card, Alert, etc.)
- [X]  Complete auth service with all 13+ endpoints
- [X]  Custom useAuth hook with auto-initialization
- [X]  Form validation utilities (email, password, phone)
- [X]  Error handling utilities

### Roadmap

#### Phase 1: MVP (Q1 2026) - ✅ Nearly Complete

- [X]  Project setup and architecture
- [X]  Docker development environment
- [X]  Complete authentication system (13+ endpoints)
- [X]  User registration & login with session management
- [X]  Email verification with auto-redirect
- [X]  Password reset flow
- [X]  Full frontend auth UI with all pages
- [X]  Session management UI
- [ ]  Property listing CRUD operations
- [ ]  User profile management
- [ ]  Property search functionality

#### Phase 2: Core Features (Q2 2026)

- [ ]  Advanced property search with filters
- [ ]  Rental application workflow
- [ ]  Payment integration
- [ ]  Notification system
- [ ]  Dashboard analytics
- [ ]  Mobile responsive design

#### Phase 3: AI Integration (Q3 2026)

- [ ]  Property recommendation engine
- [ ]  Price prediction model
- [ ]  Image classification
- [ ]  NLP-powered search

#### Phase 4: Enhancement (Q4 2026)

- [ ]  Virtual tours
- [ ]  Advanced analytics
- [ ]  Multi-language support
- [ ]  Mobile app (React Native)
- [ ]  Third-party integrations

### Quick Start

```bash
# Clone the repository
git clone https://github.com/your-username/smartproperty.git
cd smartproperty

# Start Docker services
docker-compose up -d

# Install all dependencies
npm run install:all

# Run both frontend and backend
npm run dev
```

**Access Points:**

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000/api
- Swagger Docs: http://localhost:3000/api/docs
- MailHog: http://localhost:8025
- Mongo Express: http://localhost:8081
- Redis Commander: http://localhost:8082

### Known Limitations

- AI services are currently in planning phase
- Mobile app not yet available
- Payment processing integration pending
- Limited to single-region deployment

### Performance Metrics

- **Target Response Time**: < 200ms for API calls
- **Target Uptime**: 99.9%
- **Database Performance**: Optimized for 10,000+ concurrent users
- **Code Coverage**: Target >80%

---

## 🙏 Thank You

Thank you for your interest in SmartProperty! We're building the future of property management, and we're excited to have you along for the journey.

**Star this repository** ⭐ to show your support and stay updated!

---

<div align="center">
  <p>Made with ❤️ by the SmartProperty Team</p>
  <p>© 2026 SmartProperty. All rights reserved.</p>
</div>
