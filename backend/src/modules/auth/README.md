# SmartProperty Authentication Module

## Overview

The Authentication Module provides comprehensive user authentication and authorization features for the SmartProperty platform. It includes user registration, login, JWT token management, password reset, and email verification.

## Features Implemented

### ✅ User Registration

- Email validation (RFC compliant)
- Strong password requirements (min 8 chars, uppercase, number, special character)
- Password hashing with bcrypt
- Email verification flow with token
- Welcome email sending
- User profile creation

### ✅ User Login

- Email/password authentication
- JWT access token generation (1-day expiration)
- JWT refresh token generation (7-day expiration)
- Login attempt tracking
- Account lockout after 5 failed attempts (15 minutes)
- Last login timestamp tracking

### ✅ Token Management

- Access token (short-lived: 1 day)
- Refresh token (long-lived: 7 days)
- Token refresh endpoint
- Token invalidation on logout
- Secure token storage in database

### ✅ Password Management

- Change password (authenticated users)
- Forgot password flow
- Password reset email with secure token
- Password reset with token verification
- Password reset expiration (1 hour)

### ✅ Email Verification

- Email verification token generation
- Verification email sending
- Email verification with token validation
- Token expiration (24 hours)

### ✅ Security Features

- Rate limiting on auth endpoints
- Account lockout mechanism
- Password hashing with bcrypt (10 salt rounds)
- JWT with configurable expiration
- Secure token storage
- Sensitive data filtering in responses
- Error messages don't reveal user existence

## Architecture

```
modules/auth/
├── auth.controller.ts       # HTTP endpoints
├── auth.service.ts          # Business logic
├── auth.module.ts           # Module configuration
├── dtos/
│   ├── auth.dto.ts          # Input DTOs (Register, Login, etc.)
│   └── auth-response.dto.ts # Output DTOs
├── auth.service.spec.ts     # Service tests
└── auth.controller.spec.ts  # Controller tests

modules/users/
├── user.service.ts          # User management logic
└── users.module.ts          # Users module

modules/mail/
├── mail.service.ts          # Email sending
└── mail.module.ts           # Mail module

common/
├── entities/
│   ├── user.entity.ts       # User database entity
│   └── user-profile.entity.ts
├── guards/
│   ├── jwt-auth.guard.ts    # JWT authentication guard
│   ├── role.guard.ts        # Role-based access control
│   └── index.ts
├── strategies/
│   ├── jwt.strategy.ts      # Passport JWT strategy
│   └── index.ts
└── decorators/
    └── auth.decorator.ts    # @Roles, @CurrentUser decorators
```

## API Endpoints

### Authentication Endpoints

#### `POST /auth/register`

Register a new user account.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "tenant",
  "phone": "+1234567890"
}
```

**Response:**

```json
{
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
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

#### `POST /auth/login`

Login with email and password.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:** Same as register response

#### `POST /auth/refresh-token`

Refresh access token using refresh token.

**Request:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 86400
}
```

#### `POST /auth/logout`

Logout user (requires authentication).

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response:**

```json
{
  "message": "Logged out successfully"
}
```

#### `POST /auth/forgot-password`

Request password reset email.

**Request:**

```json
{
  "email": "user@example.com"
}
```

**Response:**

```json
{
  "message": "If email exists, password reset link has been sent"
}
```

#### `POST /auth/reset-password`

Reset password using reset token.

**Request:**

```json
{
  "token": "hex_token_from_email",
  "newPassword": "NewSecurePass123!"
}
```

**Response:**

```json
{
  "message": "Password reset successfully"
}
```

#### `POST /auth/verify-email`

Verify email using verification token.

**Request:**

```json
{
  "token": "hex_token_from_email"
}
```

**Response:**

```json
{
  "message": "Email verified successfully"
}
```

#### `PATCH /auth/change-password`

Change password (requires authentication).

**Headers:**

```
Authorization: Bearer <access_token>
```

**Request:**

```json
{
  "oldPassword": "SecurePass123!",
  "newPassword": "NewSecurePass456!"
}
```

**Response:**

```json
{
  "message": "Password changed successfully"
}
```

#### `GET /auth/me`

Get current authenticated user info.

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response:**

```json
{
  "userId": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "role": "tenant"
}
```

## Database Schema

### Users Collection

```javascript
{
  _id: ObjectId,
  email: String (unique),
  password: String (hashed),
  firstName: String,
  lastName: String,
  phone: String,
  avatar: String,
  role: String (enum: admin, owner, tenant, manager, agent),
  isEmailVerified: Boolean,
  isActive: Boolean,
  lastLogin: Date,
  refreshToken: String,
  refreshTokenExpiresAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  failedLoginAttempts: Number,
  lockedUntil: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### User Profiles Collection

```javascript
{
  _id: ObjectId,
  userId: ObjectId (unique),
  dateOfBirth: Date,
  bio: String,
  occupation: String,
  income: Number,
  preferences: Object,
  documents: Array,
  createdAt: Date,
  updatedAt: Date
}
```

## Configuration

### Environment Variables

```env
# JWT Configuration
JWT_SECRET=your_jwt_secret_min_32_chars
JWT_REFRESH_SECRET=your_refresh_secret_min_32_chars
JWT_EXPIRATION=1d
JWT_REFRESH_EXPIRATION=7d

# Email Configuration
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=your_email@gmail.com
MAIL_PASSWORD=your_app_password
MAIL_FROM_NAME=SmartProperty
MAIL_FROM_ADDRESS=noreply@smartproperty.com

# Frontend URL (for email links)
APP_FRONTEND_URL=http://localhost:3000
```

## Usage Examples

### Frontend Integration

```typescript
// Register
const response = await fetch('/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePass123!',
    firstName: 'John',
    lastName: 'Doe',
  }),
});

const data = await response.json();
localStorage.setItem('accessToken', data.tokens.accessToken);
localStorage.setItem('refreshToken', data.tokens.refreshToken);

// Login
const loginResponse = await fetch('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePass123!',
  }),
});

// Protected Request
const protectedResponse = await fetch('/auth/me', {
  headers: {
    Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
  },
});

// Refresh Token
const refreshResponse = await fetch('/auth/refresh-token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    refreshToken: localStorage.getItem('refreshToken'),
  }),
});
```

### Using Guards and Decorators

```typescript
import { JwtAuthGuard, RoleGuard } from '../common/guards';
import { Roles, CurrentUser } from '../common/decorators';
import { UserRole } from '../common/entities';

@Controller('admin')
@UseGuards(JwtAuthGuard, RoleGuard)
export class AdminController {
  @Get('users')
  @Roles(UserRole.ADMIN)
  getUsers(@CurrentUser() user: any) {
    // Only admins can access this
    console.log('Requested by:', user.email);
  }
}
```

## Testing

Run the auth module tests:

```bash
# Unit tests
npm test -- src/modules/auth

# Test coverage
npm test -- src/modules/auth --coverage

# Watch mode
npm test:watch -- src/modules/auth
```

## Security Considerations

1. **Password Storage**: Passwords are hashed using bcrypt with 10 salt rounds
2. **Token Security**: Tokens are stored securely and include expiration times
3. **Account Lockout**: Accounts are locked after 5 failed login attempts for 15 minutes
4. **Email Tokens**: Password reset and verification tokens are hashed before storage
5. **CORS**: Configure CORS properly in production
6. **HTTPS**: Always use HTTPS in production
7. **Environment Variables**: Store all secrets in environment variables

## Error Handling

Common error responses:

```json
{
  "statusCode": 400,
  "message": "Email must be a valid email address",
  "error": "Bad Request"
}
```

```json
{
  "statusCode": 409,
  "message": "Email already registered",
  "error": "Conflict"
}
```

```json
{
  "statusCode": 401,
  "message": "Invalid email or password",
  "error": "Unauthorized"
}
```

```json
{
  "statusCode": 429,
  "message": "Too many requests",
  "error": "Too Many Requests"
}
```

## Future Enhancements

- [ ] OAuth2 integration (Google, Facebook, Apple)
- [ ] Two-factor authentication (2FA)
- [ ] Multi-device session management
- [ ] Password history (prevent reuse)
- [ ] Email notification preferences
- [ ] Audit logging for auth events
- [ ] CAPTCHA integration
- [ ] Biometric authentication

## Troubleshooting

### Email not sending

- Check MAIL_HOST, MAIL_PORT, and MAIL_USER configuration
- Verify email credentials are correct
- Check firewall/network settings
- Enable "Less secure app access" (Gmail) if needed

### Token verification fails

- Ensure JWT_SECRET and JWT_REFRESH_SECRET are consistent
- Check token expiration time
- Verify Authorization header format: `Bearer <token>`

### Account locked

- Wait 15 minutes for automatic unlock
- Or reset password via forgot-password endpoint

## References

- [NestJS Authentication](https://docs.nestjs.com/security/authentication)
- [Passport.js JWT Strategy](http://www.passportjs.org/packages/passport-jwt/)
- [bcrypt](https://github.com/kelektiv/node.bcrypt.js)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
