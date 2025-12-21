# Radian Platform - Quick Start Guide ✨

## 🚀 Current Status

✅ **Database Setup**: Complete with 13 test users, 7 companies, and all permissions seeded
✅ **Development Server**: Running on http://localhost:3000
✅ **Authentication**: NextAuth configured with test credentials
✅ **RBAC System**: Fully implemented with permission gates on all pages

**Next Action**: Open http://localhost:3000 in your browser and start testing!

---

## 📱 Test the Application

### Quick Start - 5 Minutes

1. **Open the app**: http://localhost:3000
   - You'll be redirected to the login page

2. **Test User #1 - Super Admin (See All Features)**
   - Email: `rahul@radian.com`
   - Password: `password123`
   - Click "Login"
   - **What to see**: 
     - Dashboard with welcome message
     - Full sidebar menu: Deals, Reports, Settings, Admin
     - All buttons visible and clickable

3. **Test User #2 - Limited Company User (See Restricted Menu)**
   - Logout (top right corner)
   - Email: `emily@freshthyme.com`
   - Password: `password123`
   - Click "Login"
   - **What to see**:
     - Dashboard with different content
     - Sidebar menu: Only Deals, Reports (no Settings, no Admin)
     - On Deals page: "Create" button visible, "Approve" button hidden
     - Try visiting http://localhost:3000/admin/companies directly - should see "Access Denied"

4. **Test User #3 - Multi-Company User (Test Context Switcher)**
   - Logout
   - Email: `bob@consultant.com`
   - Password: `password123`
   - Click "Login"
   - **What to see**:
     - Dashboard with context switcher (top right, shows "FTM")
     - Click the dropdown → see both "FTM (Buyer)" and "Coke (Sales Rep)"
     - Click "Coke (Sales Rep)" → dashboard menu changes
     - Click back to "FTM" → menu changes again
     - Shows how permissions change based on selected role

---

## 👥 All 13 Test Users (Password: `password123`)

### Radian Platform (System Owner)
| User | Company | Role | Permissions | Quick View |
|------|---------|------|-------------|-----------|
| `rahul@radian.com` | Radian | Super Admin | ✅ All features | Full access to admin pages |
| `priya@radian.com` | Radian | Account Manager | ✅ Can manage company permissions | Partial admin access |
| `amit@radian.com` | Radian | Support | 📖 Read-only access | View-only dashboards |

### FreshThyme (Merchant Company)
| User | Role | Permissions | Quick View |
|------|------|-------------|-----------|
| `john@freshthyme.com` | Admin | ✅ Full company access | All features for FTM |
| `sarah@freshthyme.com` | Category Manager | Deals + Reports | Most features except Settings |
| `emily@freshthyme.com` | Buyer | Limited | View deals, no approval/creation |

### Coca-Cola (Supplier Company)
| User | Role | Relationship | Permissions | Quick View |
|------|------|--------------|-------------|-----------|
| `lisa@coke.com` | Sales Manager | None (all relationships) | ✅ Access to all dealer data | Sees all FTM + Kroger deals |
| `mike@coke.com` | Sales Rep | FTM ↔ Coke | Scoped to FTM only | Only sees FTM relationship data |
| `david@coke.com` | Sales Rep | Kroger ↔ Coke | Scoped to Kroger only | Only sees Kroger relationship data |

### KeHE Distributors (Non-Client Supplier)
| User | Role | Permissions | Quick View |
|------|------|-------------|-----------|
| `amy@kehe.com` | Admin | Minimal permissions | Limited dashboard access |
| `james@kehe.com` | Coordinator | View-only | Can view but not create/edit |

### ABC Brokers (Broker Company)
| User | Role | Permissions | Quick View |
|------|------|-------------|-----------|
| `tom@abcbrokers.com` | Deal Coordinator | Multiple relationships | Works across 3 suppliers |

### Multi-Company User
| User | Companies | Roles | Quick View |
|------|-----------|-------|-----------|
| `bob@consultant.com` | FTM + Coke | Buyer + Sales Rep | Use context switcher to switch |

---

## 🎯 Key Features to Test

### ✅ Feature 1: Different Menus for Different Roles
**Expected Behavior**: Users with different roles see different navigation menus

**Test Steps**:
1. Login as `rahul@radian.com` (Super Admin)
   - Verify sidebar shows: Dashboard, Deals, Reports, Settings → Roles, Settings → Users, Admin → Companies, Admin → Company Permissions, Admin → Relationships
2. Logout and login as `emily@freshthyme.com` (Buyer)
   - Verify sidebar shows ONLY: Dashboard, Deals, Reports
   - Settings and Admin sections should be completely hidden
3. Logout and login as `james@kehe.com` (Coordinator)
   - Verify sidebar shows ONLY: Dashboard
   - Should have minimal access

**Why this works**: The `sidebar.tsx` component filters routes based on the user's permissions. Routes are hidden at the component level, not just disabled.

---

### ✅ Feature 2: Permission-Gated Buttons
**Expected Behavior**: Buttons are hidden/shown based on user's permissions

**Test Steps**:
1. Login as `emily@freshthyme.com` (Buyer)
2. Navigate to `/deals`
3. **Expected**:
   - ✅ "Create Deal" button is VISIBLE (she can create)
   - ❌ "Approve Deal" button is HIDDEN (she can't approve)
   - ❌ "Edit Deal" button is HIDDEN (she can't edit)
4. Login as `rahul@radian.com` (Super Admin)
5. Go to same `/deals` page
   - ✅ All buttons should be VISIBLE

**Why this works**: The `PermissionGate` component wraps each button and conditionally renders based on permission checks.

---

### ✅ Feature 3: Admin-Only Pages
**Expected Behavior**: Only Radian admins can see admin pages

**Test Steps**:
1. Login as `rahul@radian.com` (Super Admin)
2. Look at sidebar - should see "Admin" section with 3 sub-pages:
   - Companies
   - Company Permissions
   - Relationships
3. Click any admin page - should see full content
4. Logout and login as `john@freshthyme.com` (FTM Admin)
5. Sidebar should NOT show Admin section
6. Try to navigate directly to `/admin/companies`
   - **Expected**: Red "Access Denied" box with lock icon
   - Page is accessible but shows permission gate fallback

**Why this works**: Admin routes require `admin.companies`, `admin.company_permissions`, or `admin.relationships` permissions. Only Radian users have these.

---

### ✅ Feature 4: Context Switching
**Expected Behavior**: Multi-company users can switch between their roles

**Test Steps**:
1. Login as `bob@consultant.com`
2. Look at top-right corner - should see context switcher showing current context
3. Click the context switcher dropdown
   - Should see options:
     - FTM (Buyer)
     - Coke (Sales Rep)
4. Click "Coke (Sales Rep)"
   - Dashboard updates
   - Sidebar menu changes (should show different permissions for Coke role)
   - Current context in sidebar shows "Coke"
5. Click back to "FTM"
   - Menu changes back to FTM permissions
   - Current context updates

**Why this works**: The `ContextSwitcher` component calls `setCurrentContext` which updates the SessionContext. Components subscribe to this context and re-render when it changes.

---

### ✅ Feature 5: Relationship Scoping
**Expected Behavior**: Users scoped to relationships only see data for that relationship

**Test Steps**:
1. Login as `mike@coke.com` (Sales Rep scoped to FTM ↔ Coke)
2. Sidebar should show: "Scope: FTM ↔ Coke"
3. Navigate to Deals page
   - Should only see FTM deals (if they exist)
   - Croger deals should not be visible
4. Logout and login as `lisa@coke.com` (Sales Manager, no scope)
5. Sidebar should NOT show any scope
6. Navigate to Deals page
   - Should see all relationships (FTM + Kroger) deals

**Why this works**: `UserCompanyAssignment` has optional `companyRelationshipId`. When set, API endpoints filter by this relationship. Permission checks include relationship validation.

---

## 📊 Page Breakdown

### 🏠 `/` (Root)
- **Auto-redirects** to `/login` if not authenticated
- **Auto-redirects** to `/dashboard` if authenticated

### 🔐 `/login`
- Login form with email/password fields
- Pre-filled with "password123" for convenience
- 13 quick-login buttons for rapid testing
- Test users legend showing all users organized by company

### 📊 `/dashboard`
- **Protected**: Requires authentication
- Shows current context (company, role, permissions)
- Displays user's full permission list
- Welcome message with platform description

### 💼 `/deals`
- **Protected**: Requires authentication
- Mock deals table
- "Create Deal" button (permission: `deals.create`)
- "Edit" buttons (permission: `deals.edit`)
- "Approve" buttons (permission: `deals.approve`)
- **Try as emily@freshthyme.com**: Should see Create button only
- **Try as rahul@radian.com**: Should see all buttons

### 📈 `/reports`
- **Protected**: Requires authentication
- Mock reports list
- "Export" button (permission: `reports.export`)
- Info about permission-based gating
- **Try as james@kehe.com**: Should see no Export button

### ⚙️ `/settings/users`
- **Protected**: Requires authentication
- "Invite User" button (permission: `users.invite`)
- Permission check displayed
- **Try as emily@freshthyme.com**: Should see no button

### ⚙️ `/settings/roles`
- **Protected**: Requires authentication
- "Create Role" button (permission: `roles.manage`)
- Permission check displayed
- **Try as john@freshthyme.com**: Should see button (he's admin)

### 🔒 `/admin/companies`
- **Protected**: Requires `admin.companies` permission
- Only Radian users can access
- **Try as rahul@radian.com**: Full content visible
- **Try as john@freshthyme.com**: Red "Access Denied" box

### 🔒 `/admin/company-permissions`
- **Protected**: Requires `admin.company_permissions` permission
- Radian-only feature
- Shows which companies have which permissions

### 🔒 `/admin/relationships`
- **Protected**: Requires `admin.relationships` permission
- Radian-only feature
- Shows B2B relationships between companies

---

## 🔧 Technical Details

### Permission Categories

**DEALS** (5 permissions):
- `deals.view` - Can see deals
- `deals.create` - Can create deals
- `deals.edit` - Can edit deals
- `deals.approve` - Can approve deals
- `deals.delete` - Can delete deals

**REPORTS** (2 permissions):
- `reports.view` - Can see reports
- `reports.export` - Can export reports

**USERS** (3 permissions):
- `users.view` - Can view users
- `users.manage` - Can manage users
- `users.invite` - Can invite new users

**SETTINGS** (3 permissions):
- `settings.view` - Can view settings
- `settings.roles.manage` - Can manage roles
- `settings.users.manage` - Can manage users

**ADMIN** (3 permissions):
- `admin.companies` - Can manage all companies
- `admin.company_permissions` - Can grant permissions to companies
- `admin.relationships` - Can manage company relationships

### Company Types

- **RADIAN**: Platform owner (has all permissions to grant to others)
- **MERCHANT**: Buys from suppliers (e.g., FreshThyme, Kroger)
- **SUPPLIER**: Sells to merchants (e.g., Coca-Cola, KeHE, Belvita)
- **BROKER**: Facilitates deals (e.g., ABC Brokers)

### Company Relationships

- **MERCHANT_SUPPLIER**: Merchant buys from supplier
  - FreshThyme ↔ Coca-Cola
  - FreshThyme ↔ Belvita
  - Kroger ↔ Coca-Cola
  - Kroger ↔ Belvita
  
- **BROKER_SUPPLIER**: Broker works with supplier
  - ABC Brokers ↔ Coca-Cola
  - ABC Brokers ↔ Belvita
  - ABC Brokers ↔ KeHE

---

## 🐛 Troubleshooting

### Issue: Getting "Access Denied" when shouldn't
- **Check**: User permissions via dashboard permissions list
- **Solution**: Ensure user has required permission
- **Example**: If can't click "Create Deal", user needs `deals.create` permission

### Issue: Sidebar showing wrong items
- **Check**: Ensure you're logged in as correct user
- **Check**: Try context switcher if multi-company user
- **Solution**: Logout completely and login again

### Issue: Page returns 404
- **Check**: Ensure URL is correct
- **Check**: Ensure user has permission to access that route
- **Solution**: Go back to dashboard and access via sidebar

### Issue: Dev server crashed
- **Check**: Terminal output for error messages
- **Solution**: Restart server with `npm run dev`

### Issue: Can't login with any user
- **Check**: Ensure database was seeded (should see `/dev.log` with "🎉 Seeding complete!")
- **Solution**: Run `npx prisma db seed` manually

---

## 📚 Architecture Overview

```
User Login
    ↓
NextAuth Credentials Provider (checks password hash)
    ↓
JWT Token + User Assignments (includes permissions)
    ↓
SessionContext (stores current context & permissions)
    ↓
Permission-Gated Components (hide/show based on permissions)
    ↓
Sidebar Filters Routes (only shows accessible routes)
```

### Data Flow for Permission Checking

1. **User logs in** with email/password
2. **NextAuth** validates credentials against database
3. **JWT token** includes user's company assignments with roles
4. **SessionContext** extracts permissions from selected role
5. **PermissionGate** components check if user has required permission
6. **Sidebar** filters routes to only show accessible ones
7. **API routes** also validate permissions server-side

### Multi-Company Flow

1. **User with multiple assignments** logs in
2. **SessionContext** displays context switcher
3. **ContextSwitcher** shows all available company/role combinations
4. **User clicks new context** → `setCurrentContext` called
5. **SessionContext** updates current company & permissions
6. **All components** re-render with new permissions
7. **Sidebar** updates to show new accessible routes

---

## 🚀 Next Steps (For Production)

1. **Add User Management**: UI to create/edit users and assign roles
2. **Add Role Management**: UI to create roles and assign permissions
3. **Add Deal Management**: Real CRUD operations for deals
4. **Add Reports**: Generate real reports from deal data
5. **Add Email Notifications**: Send notifications on deal approvals
6. **Add API Keys**: Allow third-party integrations
7. **Add Audit Logging**: Track all user actions
8. **Add MFA**: Two-factor authentication for security
9. **Switch to PostgreSQL**: For production scalability
10. **Add Caching**: Redis for performance optimization

---

## 📞 Need Help?

### Check These Files:
- `src/lib/permissions.ts` - Permission checking logic
- `src/lib/auth.ts` - Authentication configuration
- `src/contexts/session-context.tsx` - Session state management
- `src/components/permission-gate.tsx` - Permission-based rendering
- `prisma/schema.prisma` - Database schema

### Common Debugging:
- Open browser DevTools (F12)
- Go to Network tab to see API calls
- Look at API responses to see permission arrays
- Check Console for error messages

---

## ✅ Testing Checklist

- [ ] Can login with `rahul@radian.com`
- [ ] Can see all menu items as Super Admin
- [ ] Can see different menu as `emily@freshthyme.com`
- [ ] Can switch companies using context switcher as `bob@consultant.com`
- [ ] Can see "Access Denied" on admin pages without permission
- [ ] Can see permission-gated buttons hidden/shown correctly
- [ ] Can logout and login as different user
- [ ] Dashboard shows correct permissions for logged-in user
- [ ] Sidebar correctly filters routes based on permissions
- [ ] Context switcher shows all user's company assignments

---

**Built with ❤️ - Radian Platform Prototype**
**Last Updated**: After Prisma 6 migration and database seeding
**Status**: ✅ Ready for comprehensive testing
