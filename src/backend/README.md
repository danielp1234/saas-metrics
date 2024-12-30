# SaaS Metrics Benchmarking Platform - Backend Service

## Overview

The SaaS Metrics Benchmarking Platform backend service is a Node.js-based application that provides comprehensive benchmark data for key performance indicators across different revenue ranges and data sources. Built with enterprise-grade architecture, the service implements RESTful APIs, secure authentication, and efficient data management.

## Prerequisites

- Node.js 18 LTS or higher
- Docker v20.10.0 or higher
- Docker Compose v2.0.0 or higher
- PostgreSQL client v14 or higher
- Redis client v6.2 or higher

## Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd src/backend
```

### 2. Environment Setup

Copy the environment template and configure your variables:

```bash
cp .env.example .env
```

Required environment variables:

```bash
# Server Configuration
NODE_ENV=development
PORT=3000
API_VERSION=v1

# Database Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=saas_metrics
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
POSTGRES_POOL_MIN=2
POSTGRES_POOL_MAX=10

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_secure_password

# Authentication
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
JWT_SECRET=your_jwt_secret
JWT_EXPIRY=30m
REFRESH_TOKEN_EXPIRY=7d

# Rate Limiting
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=100
```

### 3. Start Development Services

```bash
# Start PostgreSQL and Redis containers
docker-compose up -d

# Install dependencies
npm install

# Run database migrations
npm run migrate

# Start development server
npm run dev
```

## Project Structure

```
src/backend/
├── __tests__/          # Test files
├── config/             # Configuration files
├── db/                 # Database migrations and seeds
├── docs/              # API documentation
├── src/
│   ├── api/           # API routes and controllers
│   ├── auth/          # Authentication middleware
│   ├── models/        # Database models
│   ├── services/      # Business logic
│   ├── utils/         # Utility functions
│   └── validators/    # Request validators
├── .env.example       # Environment template
├── docker-compose.yml # Development services
├── package.json       # Project dependencies
└── README.md         # This file
```

## Development

### Available Scripts

```bash
# Development
npm run dev           # Start development server
npm run build        # Build production bundle
npm run start        # Start production server

# Testing
npm run test         # Run all tests
npm run test:unit    # Run unit tests
npm run test:int     # Run integration tests
npm run test:cov     # Generate coverage report

# Database
npm run migrate      # Run database migrations
npm run migrate:undo # Revert last migration
npm run seed         # Seed database with sample data

# Code Quality
npm run lint        # Run ESLint
npm run format      # Run Prettier
npm run type-check  # Run TypeScript compiler check
```

### Database Setup

The service uses PostgreSQL for primary storage and Redis for caching. Database migrations are managed using Knex.js.

```bash
# Create database
createdb saas_metrics

# Run migrations
npm run migrate

# Seed sample data (development only)
npm run seed
```

### Authentication

The service implements Google OAuth 2.0 for admin authentication with JWT-based session management.

1. Configure Google OAuth:
   - Create project in Google Cloud Console
   - Configure OAuth consent screen
   - Create OAuth 2.0 credentials
   - Add authorized redirect URIs

2. Configure JWT:
   - Set secure JWT_SECRET in environment
   - Configure token expiry times
   - Implement refresh token rotation

## API Documentation

### Base URL
```
http://localhost:3000/api/v1
```

### Authentication Endpoints

```
POST /auth/google          # Initiate Google OAuth flow
GET  /auth/google/callback # OAuth callback handler
POST /auth/refresh        # Refresh access token
POST /auth/logout         # Invalidate session
```

### Metrics Endpoints

```
GET  /metrics            # List all metrics
GET  /metrics/:id        # Get metric details
GET  /benchmarks        # Get benchmark data
POST /admin/data        # Import data (Admin)
PUT  /admin/sources     # Update sources (Admin)
```

### Rate Limiting

- Public API: 100 requests per minute
- Admin API: 1000 requests per minute
- Export API: 10 requests per minute

### Error Responses

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
```

## Testing

The service implements comprehensive testing using Jest:

```bash
# Run all tests with coverage
npm run test

# Run specific test suites
npm run test:unit     # Unit tests
npm run test:int      # Integration tests
npm run test:e2e      # End-to-end tests
```

## Deployment

### Production Deployment

1. Build the application:
```bash
npm run build
```

2. Configure production environment:
```bash
# Set production environment variables
NODE_ENV=production
```

3. Start the service:
```bash
npm run start
```

### Health Checks

The service exposes health check endpoints:

```
GET /health           # Basic health check
GET /health/detailed  # Detailed system status
```

## Security

### Best Practices

1. Environment Variables:
   - Never commit .env files
   - Use strong, unique passwords
   - Rotate secrets regularly

2. Authentication:
   - Implement MFA for admin access
   - Use secure session management
   - Implement proper CORS policies

3. Data Protection:
   - Encrypt sensitive data
   - Implement input validation
   - Use parameterized queries

## Troubleshooting

### Common Issues

1. Database Connection:
```bash
# Check database status
docker-compose ps

# View database logs
docker-compose logs db
```

2. Redis Connection:
```bash
# Check Redis status
docker-compose logs redis

# Test Redis connection
redis-cli ping
```

3. Authentication Issues:
   - Verify OAuth configuration
   - Check JWT secret configuration
   - Validate redirect URIs

### Support

For additional support:
1. Check the issue tracker
2. Review the documentation
3. Contact the development team

## License

[License Type] - See LICENSE file for details