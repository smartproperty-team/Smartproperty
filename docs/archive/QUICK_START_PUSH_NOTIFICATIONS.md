# 🚀 Push Notifications Testing - Quick Start

## ✅ Status: LIVE AND READY

Backend is running on port 3000 with all push notification endpoints active.

---

## 🎯 Test Scenario 1: Admin Sends to Tenant

### Step 1: Login as Admin

```
URL: http://localhost:5173
Email: superadmin@smartproperty.com
Password: Password123!
```

### Step 2: Click Floating Bell Button

- Look for the **blue bell icon** 🔔 in the **bottom-right corner**
- This button only appears for logged-in users

### Step 3: See the Tenant Selection Modal

The modal should show:

```
Select a tenant to send test notification
[List of available tenants]
├─ Tenant User (tenant@smartproperty.com)
├─ Another Tenant (user2@smartproperty.com)
└─ More tenants...

[Cancel] [Send] buttons
```

### Step 4: Select a Tenant

- Click on any tenant in the list
- Selected tenant will be highlighted

### Step 5: Click Send

- Notification is sent via `POST /api/notifications/push/test-to-user/{tenantId}`
- Admin sees: **"✓ Test notification sent to user"** (green toast)
- Tenant's device should show: **Desktop notification**

---

## 🎯 Test Scenario 2: Tenant Sends Self Test

### Step 1: Login as Tenant

```
URL: http://localhost:5173
Email: tenant@smartproperty.com
Password: Password123!
```

### Step 2: Click Floating Bell Button

- For tenants, the button **does NOT show a modal**
- It **directly sends** test notification to self

### Step 3: See Confirmation

- Green toast: **"✓ Test notification sent!"**
- Desktop notification appears immediately

---

## 📱 Desktop Notification Details

### Expected Notification:

```
╔═══════════════════════════════════╗
║  SmartProperty                    ║
║  Test Notification                ║
║  This is a test notification      ║
║  Click to focus window            ║
╚═══════════════════════════════════╝
```

### Where to Find It:

- **Windows**: Bottom-right of screen (notification center)
- **Mac**: Top-right of screen (Notification Center)
- **Linux**: Depends on system notifications

---

## 🔍 Technical Flow (Behind the Scenes)

### Admin Click Flow:

```
1. Admin clicks bell button
   ↓
2. Frontend calls: GET /api/users/role/tenants
   ↓
3. Modal displays list of tenants
   ↓
4. Admin selects tenant and clicks Send
   ↓
5. Frontend calls: POST /api/notifications/push/test-to-user/{tenantId}
   {
     "title": "Test Notification",
     "message": "This is a test notification"
   }
   ↓
6. Backend finds all push subscriptions for tenant
   ↓
7. Backend sends via web-push library to each subscription
   ↓
8. Tenant's browser receives push message
   ↓
9. Service Worker intercepts and shows notification
   ↓
10. User sees desktop notification
```

### Tenant Self-Test Flow:

```
1. Tenant clicks bell button
   ↓
2. Frontend calls: POST /api/notifications/push/test
   ↓
3. Backend sends to current user's subscriptions
   ↓
4. Desktop notification appears
```

---

## 🛠️ Troubleshooting

| Issue                       | Solution                                                     |
| --------------------------- | ------------------------------------------------------------ |
| Bell button doesn't appear  | Make sure you're logged in. Button hidden for guests.        |
| Modal is empty (no tenants) | Check you're logged in as SUPER_ADMIN or BRANCH_MANAGER.     |
| "401 Unauthorized" error    | Your session expired. Logout and login again.                |
| "Failed to send push" error | Check target user has at least one active subscription.      |
| Notification doesn't appear | Check browser notification permissions. Allow SmartProperty. |
| `console errors`            | Open browser DevTools (F12) to see detailed error logs.      |

---

## 🔐 Security Notes

- ✅ **Admin-only endpoint**: Only users with SUPER_ADMIN or BRANCH_MANAGER role can send to others
- ✅ **Admin cannot bypass**: Role guard prevents unauthorized access
- ✅ **Encrypted**: Push messages use VAPID encryption keys
- ✅ **Authenticated**: All endpoints require JWT token
- ✅ **Subscription-based**: Users must explicitly allow notifications

---

## 📊 Testing Checklist

- [ ] Backend started successfully (`npm run start:dev --prefix backend`)
- [ ] Login as admin works
- [ ] Login as tenant works
- [ ] Floating bell button appears for both users
- [ ] Admin sees modal with tenant list
- [ ] Admin can select different tenants
- [ ] Admin click "Send" shows success toast
- [ ] Tenant receives desktop notification
- [ ] Tenant click bell sends to self (no modal)
- [ ] Browser DevTools shows no errors
- [ ] Backend logs show successful push delivery

---

## 💡 Pro Tips

1. **Test with Multiple Tenants**: Admin can send to different tenants to verify it works for everyone
2. **Check Backend Logs**: See `[NotificationsService]` in backend terminal for delivery confirmation
3. **Check Browser Console**: Frontend logs all API calls and responses (F12 → Console)
4. **Monitor Network Tab**: See POST requests to `/api/notifications/push/test-to-user/:userId`
5. **Real Notifications**: These are real Web Push notifications with full browser integration

---

## 📱 Browser Support

- ✅ Chrome/Edge 50+
- ✅ Firefox 48+
- ✅ Opera 37+
- ❌ Safari (not yet supported)

---

## 🎓 Next Steps After Testing

1. **Verify complete admin → tenant flow works**
2. **Test notification delivery consistency**
3. **Check error handling for edge cases**
4. **Review backend logs for any warnings**
5. **Prepare for production deployment**

---

## 📝 Documentation

Full testing guide: [PUSH_NOTIFICATIONS_TEST_GUIDE.md](../PUSH_NOTIFICATIONS_TEST_GUIDE.md)

Backend implementation: `backend/src/modules/notifications/`

Frontend component: `frontend/src/components/notifications/PushNotificationTestButton.tsx`

---

**Status**: ✅ Ready for Testing
**Time to Deploy**: ~1 minute
**Dependencies**: All installed ✓
