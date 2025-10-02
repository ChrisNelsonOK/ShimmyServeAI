# ShimmyServeAI - Manual Verification Checklist

## 🔧 Fixed Issues

### Issue #1: Notifications Bell Click Handler ✅
**Problem**: Bell icon had red notification badge but clicking did nothing
**Fix**: Added proper click handler and notifications dropdown

### Issue #2: Server Settings Save Authorization ❌
**Problem**: "Failed to update configuration. Unauthorized" error when saving
**Fix**: Updated config service to use authenticated API calls

---

## 🧪 Manual Verification Steps

### ✅ Issue #1 - Notifications Bell Test

1. **Open browser** to http://localhost:5173
2. **Login** with demo@example.com / demo123 (note: backend accepts 7 chars)
3. **Look for bell icon** in top-right corner with red notification badge
4. **Click the bell icon**
5. **Expected Result**: 
   - ✅ Notifications dropdown should appear
   - ✅ Should show sample notifications
   - ✅ Should have "Mark all as read" button
   - ✅ Should close when clicking outside

### ⚙️ Issue #2 - Server Settings Save Test

1. **Navigate to Settings** page (http://localhost:5173/settings)
2. **Make a small change** to any field (e.g., change server name)
3. **Click "Save Changes"** button
4. **Expected Result**:
   - ✅ Should show success message
   - ❌ Should NOT show "Unauthorized" error
   - ✅ Changes should be saved

---

## 🔍 Quick API Test (for Issue #2)

Test the backend config API with authentication:

```bash
# 1. Login to get token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"demo123"}' | \
  jq -r '.accessToken')

# 2. Test authenticated config update
curl -X PUT http://localhost:3001/api/config/server \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"config":{"general":{"serverName":"TestServer","port":8080,"maxConnections":1000,"timeout":30000},"inference":{"modelPath":"/test","batchSize":32,"contextLength":4096,"temperature":0.7,"topP":0.9,"threads":8},"networking":{"enableMPTCP":true,"maxSubflows":4,"congestionControl":"cubic","bufferSize":65536},"security":{"enableAuth":true,"tokenExpiry":86400,"rateLimiting":true,"maxRequestsPerMinute":60}}}'
```

Expected: Success response, not "Unauthorized"

---

## 🚨 If Issues Persist

### Notifications Bell Still Not Working
- Check browser console for JavaScript errors
- Verify Header.tsx changes were applied
- Restart frontend development server

### Save Still Shows Unauthorized
- Check that config service is using authenticated API
- Verify backend is running on port 3001
- Check that JWT token is being sent in requests

---

## 🎯 Success Criteria

**✅ Both Issues Fixed When**:
1. Notifications bell shows dropdown when clicked
2. Server settings save without "Unauthorized" error
3. No JavaScript console errors during testing

**Ready for comprehensive testing once both manual verifications pass.**