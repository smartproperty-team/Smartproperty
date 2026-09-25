# 🔔 Push Notifications: Admin to Tenant Test Guide

## Overview

You now have complete push notification functionality to test notifications between:

- ✅ **Admin → Tenant**: Super Admin or Branch Manager can send test notifications to any tenant
- ✅ **Tenant → Self**: Tenants can send test notifications to themselves
- ✅ **Auto Verification**: Real notifications sent when tenant verification is approved/rejected

---

## 🎯 How to Use

### For Super Admin / Branch Manager (Admin sends to Tenant)

#### Step 1: Navigate to Dashboard

1. Open browser to `http://localhost:5173`
2. Login as admin:
   - Email: `superadmin@smartproperty.com`
   - Password: `Password123!`

#### Step 2: Click the Floating Bell Button

- Look for the **blue bell icon** in the bottom-right corner
- Click it

#### Step 3: Select a Tenant

- A modal dialog appears showing all available tenants
- Click on any tenant to select them
- Tenant name and email appear highlighted

#### Step 4: Send Test Notification

1. Click **"Send"** button
2. See confirmation toast: "✓ Test notification sent to user"
3. The selected tenant should see a desktop notification immediately

---

### For Tenants (Send to Self)

#### Step 1: Navigate to Dashboard

1. Open browser to `http://localhost:5173`
2. Login as tenant:
   - Email: `tenant@smartproperty.com`
   - Password: `Password123!`

#### Step 2: Click the Floating Bell Button

- Look for the **blue bell icon** in the bottom-right corner
- Click it (for tenants, it directly sends without modal)

#### Step 3: See Confirmation

1. Green toast appears: "✓ Test notification sent!"
2. Desktop notification appears with "Test Notification" title
3. Click notification to focus the app window

---

## 🏗️ Architecture

### Backend Endpoints (New)

```
GET  /api/notifications/push/public-key
     Returns VAPID public key for browser subscription
     Requires: JWT Auth

POST /api/notifications/push/subscribe
     Register browser for push notifications
     Requires: JWT Auth
     Body: { endpoint, keys: { p256dh, auth } }

POST /api/notifications/push/test
     Send test notification to current user
     Requires: JWT Auth

POST /api/notifications/push/test-to-user/:userId
     Send test notification to specific user
     Requires: JWT Auth + Admin role (SUPER_ADMIN or BRANCH_MANAGER)
     Params: userId - ID of recipient tenant

DELETE /api/notifications/push/unsubscribe
     Unsubscribe device from push notifications
     Requires: JWT Auth
     Body: { endpoint }

GET /api/users/role/tenants
     Get list of all tenants for admin selection
     Requires: JWT Auth + Admin role
```

### Frontend Components (New/Updated)

**File**: `frontend/src/components/notifications/PushNotificationTestButton.tsx`

- Enhanced floating bell button
- Admin modal for tenant selection
- Toast notifications for feedback
- Tenant auto-send for self-testing

---

## 📊 Testing Scenarios

### Scenario 1: Admin Tests Tenant Notification

```
1. Login as: superadmin@smartproperty.com / Password123!
2. Click floating bell
3. Select: tenant@smartproperty.com
4. Click "Send"
5. Expected: Tenant device shows desktop notification
6. Console: POST /api/notifications/push/test-to-user/[tenantId] → 200 OK
```

### Scenario 2: Tenant Self-Test

```
1. Login as: tenant@smartproperty.com / Password123!
2. Click floating bell (no modal, direct send)
3. Expected: Desktop notification appears immediately
4. Console: POST /api/notifications/push/test → 200 OK
```

### Scenario 3: Real Verification Workflow

```
1. Login as tenant → Submit for verification
2. Login as admin → Approve verification
3. Tenant automatically receives: "Account Verified ✅" notification
4. No manual test button click needed
5. Uses same push infrastructure
```

---

## 🔌 Feature Details

### Database Schema

#### PushSubscription Collection

```mongodb
{
  _id: ObjectId,
  userId: ObjectId,                    // User who subscribed
  endpoint: String,                    // Push service URL
  keys: {
    p256dh: String,                    // Encryption key
    auth: String                       // Authentication key
  },
  expirationTime: Number | null,       // When subscription expires
  createdAt: Date,
  updatedAt: Date
}
```

#### Notification Collection (existing)

```mongodb
{
  _id: ObjectId,
  userId: ObjectId,                    // Recipient
  title: String,
  message: String,
  type: NotificationType,              // VERIFICATION_APPROVED, etc.
  link: String | null,                 // Action link
  isRead: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🔐 Security & Permissions

**Admin-only test endpoint** (`/notifications/push/test-to-user/:userId`):

- ✅ Requires JWT authentication
- ✅ Requires SUPER_ADMIN or BRANCH_MANAGER role
- ✅ User cannot test others (blocked by role guard)
- ✅ Tenant cannot access admin endpoints

**Public key endpoint** (`/notifications/push/public-key`):

- ✅ Requires JWT authentication (not public)
- ✅ Returns same key for all authenticated users
- ✅ Used for browser subscription encryption

---

## 🧪 Manual Testing with cURL

### Get VAPID Public Key

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/notifications/push/public-key
```

### Send Test to Self

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  http://localhost:3000/api/notifications/push/test
```

### Send Test to Tenant (Admin Only)

```bash
curl -X POST \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  http://localhost:3000/api/notifications/push/test-to-user/TENANT_USER_ID
```

### Get List of Tenants (Admin Only)

```bash
curl -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  http://localhost:3000/api/notifications/push/tenants
```

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] Backend compiles without errors: `npm run build --prefix backend`
- [ ] Frontend compiles without errors: `npm run build --prefix frontend`
- [ ] Backend starts without errors: `npm run start:dev --prefix backend`
- [ ] Frontend starts without errors: `npm run dev --prefix frontend`
- [ ] Login as admin works: `superadmin@smartproperty.com`
- [ ] Login as tenant works: `tenant@smartproperty.com`
- [ ] Floating bell button appears for logged-in users
- [ ] Admin sees modal with tenant list
- [ ] Tenant sends to self immediately (no modal)
- [ ] Test notification creates desktop notification
- [ ] Console shows no errors for API calls

---

## 📱 Browser Support

Push notifications work on:

- ✅ Chrome 50+
- ✅ Firefox 48+
- ✅ Edge 17+
- ✅ Opera 37+
- ❌ Safari (not yet supported)

---

## 🛠️ Troubleshooting

| Problem                      | Solution                                                               |
| ---------------------------- | ---------------------------------------------------------------------- |
| Button doesn't appear        | Ensure you're logged in; button only shows for authenticated users     |
| Modal is empty (no tenants)  | Make sure you're logged in as SUPER_ADMIN or BRANCH_MANAGER            |
| 401 Error when clicking test | Token expired; try logging out and back in                             |
| Notification doesn't appear  | Check browser notification settings; allow SmartProperty notifications |
| Backend 500 error            | Check backend logs; ensure MongoDB is running                          |

---

## 📚 Related Files

### Backend

- `backend/src/modules/notifications/notifications.service.ts` - Push logic
- `backend/src/modules/notifications/notifications.controller.ts` - Endpoints
- `backend/src/modules/notifications/entities/push-subscription.entity.ts` - Schema
- `backend/src/modules/users/users.service.ts` - Tenant list query

### Frontend

- `frontend/src/components/notifications/PushNotificationTestButton.tsx` - UI
- `frontend/src/services/push-notification.service.ts` - Browser subscription
- `frontend/public/sw.js` - Service Worker
- `frontend/src/App.tsx` - Auto-initialization

---

## 🎓 Next Steps

1. **Test the feature** following the scenarios above
2. **Check browser console** (F12) for detailed logs
3. **Monitor backend logs** for failed push deliveries
4. **Review Desktop** for notification appearance
5. **Update documentation** if any issues found

---

**Status**: ✅ Ready for Production Testing
