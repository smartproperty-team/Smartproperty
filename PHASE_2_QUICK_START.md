# Phase 2 Authentication Module - Quick Start Guide

## Overview

The SmartProperty authentication system is now fully implemented! This guide will help you get started using the authentication features in your development.

---

## Installation & Setup

### 1. Configure Environment Variables

Copy the environment template and fill in your values:

```bash
# Backend directory
cd backend
cp .env.example .env.local
```

**Minimum configuration needed:**

```env
# JWT Secrets (generate your own)
JWT_SECRET=your_very_secure_jwt_secret_minimum_32_characters_long
JWT_REFRESH_SECRET=your_very_secure_refresh_secret_minimum_32_characters_long

# Email Configuration (use Mailtrap for development)
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=465
MAIL_SECURE=true
MAIL_AUTH_USER=your_mailtrap_username
MAIL_AUTH_PASS=your_mailtrap_password
```

### 2. Start the Application

```bash
# Terminal 1: Start MongoDB, Redis, and MailHog
docker-compose up

# Terminal 2: Start the backend server
cd backend
npm install
npm run start:dev
```

The API will be available at: `http://localhost:3000`

### 3. View API Documentation

Visit Swagger documentation:

```
http://localhost:3000/api/docs
```

---

## Quick Test: User Registration & Login

### Option 1: Using cURL

**Register a new user:**

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe",
    "role": "tenant"
  }'
```

**Expected response:**

```json
{
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "testuser@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "tenant",
    "isEmailVerified": false,
    "isActive": true,
    "createdAt": "2026-02-03T10:00:00Z"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 86400
  }
}
```

**Login with credentials:**

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "SecurePass123!"
  }'
```

**Get current user:**

```bash
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer <your_access_token>"
```

### Option 2: Using Postman

1. Open Postman
2. Import the endpoints from Swagger docs
3. Create a collection with requests:
   - `POST /auth/register`
   - `POST /auth/login`
   - `GET /auth/me`
   - `POST /auth/logout`
   - `PATCH /auth/change-password`
   - etc.

### Option 3: Using the Frontend (React)

```typescript
// src/services/api.ts
import axios from "axios";

const API_BASE = "http://localhost:3000";

const api = axios.create({ baseURL: API_BASE });

// Register
export const register = (data) => api.post("/auth/register", data);

// Login
export const login = (email, password) =>
  api.post("/auth/login", { email, password });

// Get current user
export const getCurrentUser = (token) =>
  api.get("/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });

// Logout
export const logout = (token) =>
  api.post(
    "/auth/logout",
    {},
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
```

---

## Common Operations

### Register User

```bash
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "tenant",
  "phone": "+1234567890"
}
```

### Login

```bash
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

### Refresh Token

```bash
POST /auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Change Password

```bash
PATCH /auth/change-password
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "oldPassword": "SecurePass123!",
  "newPassword": "NewSecurePass456!"
}
```

### Forgot Password

```bash
POST /auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

Check MailHog at `http://localhost:1025` to view reset email.

### Reset Password

```bash
POST /auth/reset-password
Content-Type: application/json

{
  "token": "token_from_email",
  "newPassword": "NewSecurePass456!"
}
```

### Logout

```bash
POST /auth/logout
Authorization: Bearer <access_token>
```

---

## Using Protected Routes

### Protect a route with JWT guard

```typescript
import { UseGuards, Get } from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards";
import { CurrentUser } from "../common/decorators";

@Controller("users")
@UseGuards(JwtAuthGuard)
export class UsersController {
  @Get("profile")
  getUserProfile(@CurrentUser() user: any) {
    console.log("Current user:", user);
    return user;
  }
}
```

### Protect routes by role

```typescript
import { UseGuards, Get } from "@nestjs/common";
import { JwtAuthGuard, RoleGuard } from "../common/guards";
import { Roles, CurrentUser } from "../common/decorators";
import { UserRole } from "../common/entities";

@Controller("admin")
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  @Get("users")
  getAllUsers() {
    return []; // Only admins can access
  }

  @Get("statistics")
  getStatistics() {
    return {}; // Only admins can access
  }
}
```

---

## Password Requirements

Passwords must meet these requirements:

- ✅ Minimum 8 characters
- ✅ At least 1 uppercase letter (A-Z)
- ✅ At least 1 number (0-9)
- ✅ At least 1 special character (@$!%\*?&)

**Valid examples:**

- `SecurePass123!`
- `MyPassword@2024`
- `Test$123Pass`

**Invalid examples:**

- `password123` - No uppercase or special char
- `Pass!@#` - Too short
- `ALLUPPERCASE123` - No special char

---

## Email Testing

### Development (MailHog)

MailHog is running on `http://localhost:1025`

1. Open http://localhost:1025 in your browser
2. Register a user to see welcome email
3. Forgot password to see reset email
4. Check email inbox in MailHog dashboard

### Production (Mailtrap, Gmail, SendGrid, etc.)

Update `.env` with your email provider credentials.

---

## Authentication Flow Diagram

```
┌─────────────────────┐
│   User Frontend     │
└──────────┬──────────┘
           │
           │ 1. POST /auth/register
           │    or
           │    POST /auth/login
           │
           ▼
┌─────────────────────┐         ┌─────────────────┐
│   Auth Controller   │────────▶│  Auth Service   │
└─────────────────────┘         └────────┬────────┘
                                        │
                                        │ Generate JWT
                                        │ Hash Password
                                        │
                                        ▼
                              ┌─────────────────┐
                              │   MongoDB       │
                              │   (Save User)   │
                              └─────────────────┘

Protected Route:
┌─────────────────────┐
│  Frontend + Token   │
└──────────┬──────────┘
           │
           │ GET /auth/me
           │ Authorization: Bearer <token>
           │
           ▼
┌─────────────────────┐      ┌──────────────────┐
│  Protected Route    │─────▶│  JWT Strategy    │
│  (with Guard)       │      │  (Verify Token)  │
└─────────────────────┘      └──────────────────┘
           │
           │ ✅ Valid Token
           │
           ▼
       Handler Logic
```

---

## Troubleshooting

### Issue: "Email already registered"

**Solution**: Use a different email or check your MongoDB data

### Issue: "Invalid email or password"

**Solution**: Check email and password are correct (case-sensitive)

### Issue: "Account is locked"

**Solution**: Wait 15 minutes or reset password via forgot-password endpoint

### Issue: "Email not sending"

**Steps**:

1. Check Mailtrap/Gmail credentials in `.env`
2. Verify MAIL_HOST, MAIL_PORT, MAIL_AUTH_USER, MAIL_AUTH_PASS
3. Check MailHog: http://localhost:1025
4. Review server logs for errors

### Issue: "Invalid or expired refresh token"

**Solution**: Login again to get new tokens

### Issue: "Unauthorized" on protected routes

**Solution**:

1. Include Authorization header: `Authorization: Bearer <token>`
2. Ensure token hasn't expired (1 day)
3. Use refresh-token endpoint to get new access token

---

## Next Steps

1. **Review the code**: Check `src/modules/auth/` to understand the implementation
2. **Read documentation**: See [Authentication Module README](src/modules/auth/README.md)
3. **Run tests**: `npm test -- src/modules/auth`
4. **Integrate with frontend**: Use the API endpoints in your React app
5. **Customize**: Add additional fields or modify validators as needed

---

## Useful Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [Passport.js](http://www.passportjs.org/)
- [JWT Introduction](https://jwt.io/introduction)
- [bcrypt](https://github.com/kelektiv/node.bcrypt.js)
- [HTTP Status Codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)

---

## Need Help?

1. Check the error message in response
2. Review server logs: `npm run start:dev`
3. Check endpoint documentation: http://localhost:3000/api/docs
4. Review tests for usage examples: `src/modules/auth/*.spec.ts`
5. Check environment variables: `backend/.env.local`

---

**Happy coding! 🚀**
