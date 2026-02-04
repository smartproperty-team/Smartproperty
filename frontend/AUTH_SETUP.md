# Frontend Authentication Setup

## ✅ What's Been Created

### 1. **Authentication Pages**

- **LoginPage** (`src/pages/LoginPage.tsx`) - Responsive login form
- **RegisterPage** (`src/pages/RegisterPage.tsx`) - User registration with validation
- **DashboardPage** (`src/pages/DashboardPage.tsx`) - Protected dashboard

### 2. **Authentication Services**

- **API Client** (`src/services/api.ts`) - Axios instance with token management
- **Auth Service** (`src/services/auth.service.ts`) - API endpoints wrapper
- **useAuth Hook** (`src/hooks/useAuth.ts`) - Authentication logic hook

### 3. **State Management**

- **Auth Store** (`src/store/authStore.ts`) - Zustand store with persistence
- **ProtectedRoute** (`src/components/ProtectedRoute.tsx`) - Route protection component

### 4. **Routing**

- Updated `App.tsx` with react-router-dom setup
- Routes configured:
  - `/login` - Login page
  - `/register` - Register page
  - `/dashboard` - Protected dashboard (requires authentication)
  - `/` - Redirects to dashboard

---

## 🚀 Getting Started

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Start Frontend Dev Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### 3. Backend Must Be Running

Make sure the backend server is running on `http://localhost:3000`:

```bash
cd backend
npm run start:dev
```

---

## 🔓 Features

### ✅ Login

- Email and password validation
- Automatic token storage
- Token refresh on expiration
- Error handling with toast notifications

### ✅ Registration

- Password strength validation
  - Minimum 8 characters
  - Uppercase letter required
  - Number required
  - Special character required (!@#$%^&\*)
- Password confirmation
- Email validation
- Automatic login after registration

### ✅ Protected Routes

- Automatic redirect to login if not authenticated
- Session persistence (survives page refresh)
- Automatic logout on token expiration

### ✅ State Management

- Zustand store with localStorage persistence
- User information stored
- Access and refresh tokens managed
- Logout clears all data

---

## 🧪 Test Credentials

### Register New Account

1. Go to `http://localhost:5173/register`
2. Fill in the form with:
   - First Name: `John`
   - Last Name: `Doe`
   - Email: `john@example.com`
   - Password: `Test1234!`
   - Confirm: `Test1234!`
3. Click "Create account"

### Login

1. Go to `http://localhost:5173/login`
2. Enter:
   - Email: `john@example.com`
   - Password: `Test1234!`
3. Click "Sign in"

---

## 📁 Project Structure

```
src/
├── pages/
│   ├── LoginPage.tsx          # Login form page
│   ├── RegisterPage.tsx       # Registration form page
│   └── DashboardPage.tsx      # Protected dashboard
├── services/
│   ├── api.ts                 # Axios instance with interceptors
│   └── auth.service.ts        # Authentication API calls
├── hooks/
│   └── useAuth.ts             # Custom authentication hook
├── store/
│   └── authStore.ts           # Zustand authentication store
├── components/
│   └── ProtectedRoute.tsx     # Route protection wrapper
├── App.tsx                    # Main router setup
└── main.tsx                   # Entry point
```

---

## 🔌 API Integration

### Endpoints Integrated

- `POST /auth/login` - Login with email/password
- `POST /auth/register` - Register new user
- `GET /auth/me` - Get current user info
- `POST /auth/logout` - Logout (invalidate token)
- `POST /auth/refresh-token` - Refresh access token

### Automatic Features

- **Request Interceptor**: Adds Authorization header with bearer token
- **Response Interceptor**: Auto-refreshes token on 401 error
- **Error Handling**: Toast notifications for all errors
- **Token Storage**: Persists in localStorage

---

## 🎨 UI Components

### Styling

- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Beautiful icons
- **Framer Motion** - Smooth animations (ready to use)
- **React Hot Toast** - Toast notifications

### Features

- Dark theme (slate colors)
- Gradient buttons
- Input validation feedback
- Loading states
- Responsive design
- Focus states and transitions

---

## 🛠️ Customization

### Change API URL

Edit `src/services/api.ts`:

```typescript
const API_URL = "http://localhost:3000/api/v1";
```

### Update Styling

- **Colors**: Edit Tailwind classes in components
- **Fonts**: Update in `index.css`
- **Spacing**: Modify Tailwind scale values

### Add New Routes

Edit `src/App.tsx`:

```typescript
<Route path="/new-page" element={<NewPage />} />
```

### Extend Auth Service

Add new methods to `src/services/auth.service.ts`:

```typescript
changeEmail: async (data: ChangeEmailRequest) => {
  const response = await apiClient.patch("/auth/change-email", data);
  return response.data;
};
```

---

## 🔐 Security Features

✅ Secure token storage (localStorage)
✅ Automatic token refresh
✅ Protected routes with redirects
✅ CORS configured
✅ Bearer token authentication
✅ Session persistence

---

## 📱 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

---

## 🚨 Troubleshooting

### "Cannot connect to backend"

- Ensure backend is running on port 3000
- Check CORS configuration in backend
- Verify API URL in `src/services/api.ts`

### "Invalid token"

- Clear localStorage: `localStorage.clear()`
- Re-login to get new tokens
- Check token expiration in backend config

### "Page refreshes to login"

- Check browser console for errors
- Verify token is stored in localStorage
- Check backend JWT secret configuration

### "CORS error"

- Backend needs CORS enabled
- Check `backend/src/main.ts` CORS setup
- Verify correct origin: `http://localhost:5173`

---

## 📚 Next Steps

1. **Add Password Reset Flow**
   - Create forgot-password page
   - Add reset-password page with token

2. **Add User Profile Page**
   - Display user information
   - Allow profile updates
   - Avatar upload

3. **Add Role-Based UI**
   - Show different pages based on user role
   - Admin dashboard
   - Tenant dashboard

4. **Add Email Verification**
   - Email verification page
   - Resend verification email
   - Display status

5. **Add 2FA (Optional)**
   - Two-factor authentication setup
   - TOTP or SMS verification

---

## 🎓 Key Technologies

- **React 19** - UI library
- **React Router v7** - Routing
- **Zustand** - State management
- **Axios** - HTTP client
- **React Hook Form** - Form handling
- **Zod** - Schema validation
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **React Hot Toast** - Notifications

---

**Status**: ✅ **Ready to Use**

Start the development server and navigate to `http://localhost:5173/login` to begin!
