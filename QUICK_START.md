# Radian Platform - Quick Reference Card 🚀

## 🎯 Start Here

1. **Open Browser**: http://localhost:3000
2. **You'll be redirected to**: http://localhost:3000/login
3. **Test Credentials**: All test users use password `password123`

## 👥 Quick Test Users

### Try These First (Copy-Paste Ready)

**Super Admin - See Everything**
```
Email: rahul@radian.com
Password: password123
```
✅ Full access to all features

**Limited User - See Restricted Menu**
```
Email: emily@freshthyme.com
Password: password123
```
✅ Sees only Deals + Reports, no Admin

**Multi-Company User - Test Context Switcher**
```
Email: bob@consultant.com
Password: password123
```
✅ Works at both FTM and Coke, use dropdown to switch

**Minimal Access - Read-Only**
```
Email: james@kehe.com
Password: password123
```
✅ Can only view dashboard

**Admin User - Full Company Access**
```
Email: john@freshthyme.com
Password: password123
```
✅ Full access within FreshThyme

---

## 🎯 5-Minute Test Plan

1. **Login as rahul@radian.com** (2 min)
   - Verify: See all menu items (Deals, Reports, Settings, Admin)
   - Click on each page to verify access
   - Look at Admin section - should see 3 admin pages

2. **Logout and login as emily@freshthyme.com** (2 min)
   - Verify: Sidebar shows ONLY Deals + Reports (no Admin/Settings)
   - Go to /deals - "Create" button visible, "Approve" button hidden
   - Try /admin/companies - Should see "Access Denied"

3. **Logout and login as bob@consultant.com** (1 min)
   - Verify: See context switcher (top right)
   - Click dropdown - see "FTM" and "Coke"
   - Click to switch - sidebar menu changes

---

## 📍 Key Pages to Visit

| Page | URL | Best User | What to See |
|------|-----|-----------|------------|
| Dashboard | `/dashboard` | Any user | Current context & permissions |
| Deals | `/deals` | All users | Permission-gated buttons |
| Reports | `/reports` | All users | Export button gating |
| Settings - Users | `/settings/users` | All users | Invite button gating |
| Settings - Roles | `/settings/roles` | All users | Role management gating |
| Admin - Companies | `/admin/companies` | rahul@radian.com | Full content; others see "Access Denied" |
| Admin - Permissions | `/admin/company-permissions` | rahul@radian.com | Only Radian admin access |
| Admin - Relationships | `/admin/relationships` | rahul@radian.com | Only Radian admin access |

---

## ✨ Key Features to Notice

### 1️⃣ Different Menus Per Role
- Login as super admin → See all options
- Login as buyer → See limited options
- **This is RBAC working!**

### 2️⃣ Permission-Gated Buttons
- On `/deals` as emily → See "Create" button (she can)
- On `/deals` as emily → NO "Approve" button (she can't)
- **This is permission gates working!**

### 3️⃣ Context Switcher
- Login as bob
- Top-right shows current company
- Click dropdown → Switch to different role
- Menu changes instantly
- **This is multi-company support working!**

### 4️⃣ Admin Pages
- Accessible: http://localhost:3000/admin/companies
- As rahul → See content
- As emily → See "Access Denied"
- **This is access control working!**

---

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| Can't login | Check `.env.local` has `DATABASE_URL=file:./prisma/dev.db` |
| Server won't start | Run `npm run dev` in terminal |
| Database empty | Run `npx prisma db seed` |
| Pages show error | Check browser console (F12) for error messages |
| Buttons not appearing | Try logout/login to refresh session |

---

## 📊 Test Data Summary

### Companies
- **Radian** - Platform owner
- **FreshThyme** - Merchant
- **Coca-Cola** - Supplier
- **KeHE** - Non-client supplier
- **ABC Brokers** - Broker
- **Kroger** - Merchant (for relationships)
- **Belvita** - Supplier (for relationships)

### Users by Access Level
- **Full Access** (3): rahul, priya, amit
- **Company Admin** (2): john, amy
- **Manager/Mid** (4): sarah, lisa, tom, bob
- **Limited/Read-Only** (4): emily, james, mike, david

### Relationships Tested
- **MERCHANT_SUPPLIER**: FTM↔Coke, FTM↔Belvita, Kroger↔Coke, Kroger↔Belvita
- **BROKER_SUPPLIER**: ABC↔Coke, ABC↔Belvita, ABC↔KeHE

---

## 💡 Tips for Testing

### Tip 1: Check Permissions on Dashboard
1. Login as any user
2. Go to dashboard
3. Scroll down to see their exact permissions
4. This helps understand what buttons should show

### Tip 2: Use Browser DevTools
1. Open DevTools (F12)
2. Go to Network tab
3. Click a button → See API call
4. Look at response to see permission checks

### Tip 3: Test All Scenarios
1. Super admin (should see everything)
2. Company admin (should see company features)
3. Limited user (should see minimal features)
4. Read-only user (should see view-only buttons)
5. Multi-company user (should have switcher)

### Tip 4: Logout Between Tests
1. Click username top-right → Logout
2. Fully logout to clear session
3. Then login as different user

---

## 📚 Documentation Files

| File | What's In It |
|------|-------------|
| `README.md` | Overview & feature list |
| `README_SETUP.md` | Setup instructions for developers |
| `TESTING_GUIDE.md` | Complete testing scenarios & checklist |
| `ARCHITECTURE.md` | Technical deep dive for developers |
| `COMPLETION_STATUS.md` | Project status & completion checklist |
| **This file** | Quick reference & testing guide |

---

## 🎯 What You're Testing

### The RBAC System
```
User Logs In
    ↓
Gets Assigned Permissions
    ↓
Sidebar Filters to Accessible Pages
    ↓
Permission Gates Hide/Show Buttons
    ↓
API Routes Validate Permissions
```

### Different User Scenarios
1. ✅ Super admin sees everything
2. ✅ Company admin sees company features
3. ✅ Limited user sees restricted features
4. ✅ Read-only user sees view-only UI
5. ✅ Multi-company user can switch roles

### Permission Categories
- **DEALS** - Create, view, edit, approve deals
- **REPORTS** - View and export reports
- **USERS** - Manage company users
- **SETTINGS** - Manage roles and company settings
- **ADMIN** - Radian-only management features

---

## ✅ Success Criteria

You'll know it's working when:

1. ✅ Different users have different sidebar menus
2. ✅ Buttons are hidden for unauthorized users
3. ✅ Admin pages show "Access Denied" for non-admins
4. ✅ Context switcher works for multi-company users
5. ✅ Relationship-scoped users see filtered data
6. ✅ Session persists on page refresh
7. ✅ Dashboard shows correct user permissions
8. ✅ Can logout successfully

---

## 🚀 Running Commands

### Start Development Server
```bash
npm run dev
```
Opens on http://localhost:3000

### Seed Database
```bash
npx prisma db seed
```
Populates with test data

### Generate Prisma Client
```bash
npx prisma generate
```
Regenerates type-safe client

### View Database
```bash
sqlite3 prisma/dev.db
```
Query database directly

### Reset Database
```bash
npx prisma migrate reset
```
⚠️ Deletes all data and reseed

---

## 📞 Need Help?

1. **Can't login?** Check `/login` page loads
2. **Wrong menu?** Go to dashboard, check permissions list
3. **Button not showing?** User might not have permission
4. **Can't switch companies?** User might only work at one company
5. **Admin page error?** Try login as `rahul@radian.com`

---

## 🎉 You're All Set!

Everything is ready to test. Just:
1. Open http://localhost:3000
2. Login with test credentials
3. Explore the features
4. Test different user scenarios

**Enjoy testing the Radian Platform! 🚀**

---

**Last Updated**: December 20, 2024  
**Server Status**: ✅ Running  
**Database Status**: ✅ Seeded  
**Ready for Testing**: ✅ YES
