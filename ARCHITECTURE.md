# Radian Platform - Architecture & Developer Guide

## 📐 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User Browser                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  React Components (Next.js App Router)              │  │
│  │  - Pages (layout, dashboard, deals, reports, etc)   │  │
│  │  - Components (sidebar, context-switcher, gate)     │  │
│  │  - SessionContext (manages user state)              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↓
                  NEXTAUTH INTEGRATION
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                   Next.js Backend (Server)                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  API Routes                                         │  │
│  │  - /api/auth/[...nextauth] (Authentication)        │  │
│  │  - /api/routes (Filter accessible routes)          │  │
│  │  - /api/companies, /api/users, etc (CRUD ops)      │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Libraries                                          │  │
│  │  - lib/auth.ts (NextAuth config, password hashing) │  │
│  │  - lib/permissions.ts (Permission utilities)        │  │
│  │  - lib/prisma.ts (Database client)                 │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↓
                    PRISMA ORM
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                   SQLite Database                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Tables                                             │  │
│  │  - CompanyMaster (7 companies)                      │  │
│  │  - UserMaster (13 test users)                       │  │
│  │  - DesignationMaster (12 roles)                     │  │
│  │  - PermissionMaster (16 permissions)                │  │
│  │  - UserCompanyAssignment (16 assignments)           │  │
│  │  - CompanyAvailablePermission (grants)              │  │
│  │  - DesignationPermission (role → permission)        │  │
│  │  - Route & RoutePermission (navigation)             │  │
│  │  - CompanyRelationship (B2B relationships)          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Permission System Flow

### Three-Layer Permission Architecture

```
LAYER 1: Radian Control
┌──────────────────────────────────────┐
│ Radian grants permissions to         │
│ each company (what they CAN use)     │
│                                      │
│ Table: CompanyAvailablePermission    │
│ Example: KeHE can use:               │
│   - deals.view                       │
│   - reports.view                     │
│   (only 2 of 16 total)               │
└──────────────────────────────────────┘

LAYER 2: Company Control
┌──────────────────────────────────────┐
│ Company creates roles and assigns    │
│ ONLY available permissions to them   │
│                                      │
│ Table: DesignationPermission         │
│ Example: FTM "Buyer" role gets:      │
│   - deals.view                       │
│   - deals.create                     │
│   - reports.view                     │
│   (only from what Radian allowed)    │
└──────────────────────────────────────┘

LAYER 3: User Assignment
┌──────────────────────────────────────┐
│ Users assigned to roles in           │
│ companies (optionally scoped to       │
│ relationships)                       │
│                                      │
│ Table: UserCompanyAssignment         │
│ Example: Emily assigned to:          │
│   - Company: FreshThyme              │
│   - Role: Buyer                      │
│   - Scope: None (sees all)           │
│                                      │
│ Permissions inherited from role      │
└──────────────────────────────────────┘
```

### Permission Checking in Code

```typescript
// 1. Get user's permissions from database
async function getUserPermissions(userId, companyId) {
  const assignment = await prisma.userCompanyAssignment.findFirst({
    where: { userId, companyId },
    include: {
      designation: {
        include: {
          permissions: {
            include: { permission: true }
          }
        }
      }
    }
  });
  
  return assignment.designation.permissions.map(p => p.permission.permissionKey);
  // Returns: ['deals.view', 'deals.create', 'reports.view', ...]
}

// 2. Check if user has permission
function hasPermission(permissions, required) {
  return permissions.includes(required);
  // hasPermission(['deals.view', 'deals.create'], 'deals.approve') → false
  // hasPermission(['deals.view', 'deals.create'], 'deals.view') → true
}

// 3. Use in UI component
<PermissionGate permission="deals.create">
  <button>Create Deal</button>
</PermissionGate>

// 4. PermissionGate checks current user's permissions from SessionContext
export function PermissionGate({ permission, children, fallback }) {
  const { currentContext } = useContext(SessionContext);
  
  if (currentContext?.permissions.includes(permission)) {
    return children;  // Show button
  } else {
    return fallback || null;  // Hide button
  }
}
```

---

## 📦 Key Files & Their Responsibilities

### Authentication Layer

**File**: `src/lib/auth.ts`
**Purpose**: NextAuth configuration and authentication logic
**Key Exports**:
- `authOptions`: NextAuth configuration with Credentials Provider
- Callbacks:
  - `credentials`: Validates email/password
  - `jwt`: Adds user data to JWT token
  - `session`: Copies JWT data to session

**Flow**:
```
User submits email/password
  ↓
NextAuth calls credentials callback
  ↓
Database lookup: UserMaster.findUnique(email)
  ↓
bcryptjs.compare(password, hashedPassword)
  ↓
If valid: return { id, email, name }
  ↓
JWT callback enriches token with:
  - user.id, user.email, user.name
  - user.assignments (array of {companyId, designationId, ...})
  ↓
Session callback returns token data as session.user
```

**Example JWT token payload**:
```json
{
  "sub": "user-uuid-123",
  "email": "emily@freshthyme.com",
  "name": "Emily Johnson",
  "assignments": [
    {
      "userCompanyAssignmentId": "uuid",
      "companyId": "ftm-uuid",
      "company": { "companyName": "FreshThyme" },
      "designationId": "buyer-uuid",
      "designation": { 
        "designationName": "Buyer",
        "permissions": [
          { "permission": { "permissionKey": "deals.view" } },
          { "permission": { "permissionKey": "deals.create" } },
          ...
        ]
      }
    }
  ],
  "iat": 1702XXX,
  "exp": 1702XXX
}
```

### Session & Context Management

**File**: `src/contexts/session-context.tsx`
**Purpose**: Client-side state management for user's permissions and accessible routes
**Exports**:
- `SessionContext`: React Context for permission data
- `SessionProvider`: Component that wraps the app

**Key State**:
```typescript
interface SessionContextType {
  currentContext: {
    companyId: string;
    companyName: string;
    companyRelationshipId: string | null;
    relationshipName: string | null;
    designationId: string;
    designationName: string;
    permissions: string[];  // ['deals.view', 'deals.create', ...]
  };
  setCurrentContext: (context) => Promise<void>;
  userAssignments: any[];
  accessibleRoutes: any[];
  loading: boolean;
}
```

**Lifecycle**:
```
1. Component mounts
2. useSession() called → gets JWT token
3. Extract assignments from token
4. Set first assignment as initial context
5. Fetch `/api/routes` with permissions
6. Store routes in context
7. Components subscribe to context
8. When context changes → all components re-render
```

### Permission Utilities

**File**: `src/lib/permissions.ts`
**Purpose**: Reusable functions for permission checking
**Exports**:
- `getUserPermissions(userId, companyId, relationshipId?)`: Get user's permission keys
- `hasPermission(permissions, required)`: Check single permission (AND)
- `hasAnyPermission(permissions, required[])`: Check any permission (OR)
- `hasAllPermissions(permissions, required[])`: Check all permissions (AND)
- `getAccessibleRoutes(permissions)`: Filter routes by permissions
- `getCompanyAvailablePermissions(companyId)`: Get company's allowed permissions

**Usage**:
```typescript
// In API routes (server-side)
const permissions = await getUserPermissions(userId, companyId);
if (!hasPermission(permissions, 'deals.create')) {
  return res.status(403).json({ error: 'Forbidden' });
}

// In components (client-side)
<PermissionGate permission="deals.create">
  <button>Create</button>
</PermissionGate>
```

### Permission-Based UI Component

**File**: `src/components/permission-gate.tsx`
**Purpose**: Conditional rendering based on permission checks
**Props**:
```typescript
interface PermissionGateProps {
  permission?: string;           // Single permission check (AND)
  permissions?: string[];        // Multiple permissions (OR by default)
  requireAll?: boolean;          // If true, require ALL permissions (AND)
  fallback?: React.ReactNode;    // What to show if denied
  children: React.ReactNode;     // What to show if allowed
}
```

**Examples**:
```tsx
// Single permission - AND logic
<PermissionGate permission="deals.create">
  <button>Create Deal</button>
</PermissionGate>

// Multiple permissions - OR logic (show if ANY)
<PermissionGate permissions={["deals.edit", "deals.approve"]}>
  <button>Modify Deal</button>
</PermissionGate>

// Multiple permissions - AND logic (show if ALL)
<PermissionGate 
  permissions={["deals.create", "deals.approve"]} 
  requireAll
>
  <button>Fast-Track Deal</button>
</PermissionGate>

// With fallback UI
<PermissionGate 
  permission="admin.companies"
  fallback={<div className="text-red-500">❌ Access Denied</div>}
>
  <div>Full admin content</div>
</PermissionGate>
```

### Navigation Sidebar

**File**: `src/components/sidebar.tsx`
**Purpose**: Render navigation menu based on accessible routes
**Features**:
- Filters routes to top-level only
- Shows icons with route names
- Highlights current active route
- Displays current context (company, role, scope)
- Shows all user's permissions (debug info)

**Route Filtering**:
```typescript
// Only show top-level routes
const topLevelRoutes = accessibleRoutes.filter(
  route => route.showOnSideMenu && !route.parentRouteId
);

// Shows in sidebar: Dashboard, Deals, Reports, Settings, Admin
// Hidden from sidebar: Roles (child of Settings), Companies (child of Admin)
```

**Current Context Display**:
```
Company: FreshThyme
Role: Buyer
Scope: None (can see all data)
Permissions: 5
```

Or if scoped:
```
Company: Coca-Cola
Role: Sales Rep
Scope: FTM ↔ Coca-Cola
Permissions: 8
```

### Context Switcher

**File**: `src/components/context-switcher.tsx`
**Purpose**: Allow users with multiple company assignments to switch roles
**Features**:
- Shows dropdown of all user's company/role combinations
- Groups by company with type badge
- Shows relationship scope if applicable
- Highlights currently selected context
- Updates permissions on selection

**Dropdown Items**:
```
FTM (MERCHANT)
  └─ Buyer (current)
  
Coke (SUPPLIER)
  └─ Sales Rep (Scope: FTM ↔ Coke)
```

### API Routes

#### `/api/auth/[...nextauth]/route.ts`
- Handles all authentication requests
- Uses NextAuth with Credentials Provider
- No custom logic needed (proxies to authOptions)

#### `/api/routes/route.ts`
- **Method**: POST
- **Body**: `{ permissions: string[] }`
- **Returns**: Filtered routes array
- **Logic**: Returns all routes where no permission required OR user has permission

**Request/Response**:
```
POST /api/routes
{
  "permissions": ["deals.view", "deals.create", "reports.view"]
}

Response:
[
  { id: "...", routeName: "Dashboard", path: "/dashboard", ... },
  { id: "...", routeName: "Deals", path: "/deals", ... },
  { id: "...", routeName: "Reports", path: "/reports", ... },
]
```

---

## 🏗️ Database Schema Details

### CompanyMaster
```
Column          | Type      | Notes
─────────────────────────────────────────
companyId       | UUID      | Primary key
companyName     | String    | e.g., "FreshThyme"
companyType     | String    | RADIAN|MERCHANT|SUPPLIER|BROKER
companyStatus   | String    | ACTIVE|INACTIVE
isClient        | Boolean   | Whether company pays for platform
createdAt       | DateTime  | Auto-generated
updatedAt       | DateTime  | Auto-updated
```

### UserMaster
```
Column            | Type      | Notes
──────────────────────────────────────────
userId            | UUID      | Primary key
email             | String    | Unique, lowercase
fullName          | String    | Display name
passwordHash      | String    | bcryptjs hashed
isActive          | Boolean   | Can login or not
createdAt         | DateTime  | Auto-generated
```

### DesignationMaster
```
Column            | Type      | Notes
──────────────────────────────────────────
designationId     | UUID      | Primary key
companyId         | UUID      | FK to CompanyMaster
designationName   | String    | e.g., "Super Admin", "Buyer"
designationDesc   | String    | Description
isActive          | Boolean   | Can be assigned to users
createdAt         | DateTime  | Auto-generated
```

### UserCompanyAssignment
```
Column                    | Type      | Notes
─────────────────────────────────────────────────
userCompanyAssignmentId   | UUID      | Primary key
userId                    | UUID      | FK to UserMaster
companyId                 | UUID      | FK to CompanyMaster
designationId             | UUID      | FK to DesignationMaster
companyRelationshipId     | UUID?     | Optional - scopes user to relationship
createdAt                 | DateTime  | Auto-generated

Example:
- Bob user assigned to FreshThyme as Buyer (no scope)
- Bob user assigned to Coca-Cola as Sales Rep (scoped to FTM↔Coke)
```

### PermissionMaster
```
Column          | Type      | Notes
─────────────────────────────────────────
permissionId    | UUID      | Primary key
permissionKey   | String    | e.g., "deals.create"
permissionName  | String    | e.g., "Create Deals"
category        | String    | DEALS|REPORTS|USERS|SETTINGS|ADMIN
isActive        | Boolean   | Can be assigned
createdAt       | DateTime  | Auto-generated
```

### CompanyAvailablePermission
```
Column            | Type      | Notes
──────────────────────────────────────────
id                | UUID      | Primary key
companyId         | UUID      | FK to CompanyMaster
permissionId      | UUID      | FK to PermissionMaster
grantedAt         | DateTime  | When Radian granted this
grantedBy         | UUID      | Which Radian user granted
createdAt         | DateTime  | Auto-generated

Example:
- FreshThyme can use: deals.*, reports.*, users.*, settings.*
- KeHE can use: deals.view, reports.view only
```

### DesignationPermission
```
Column            | Type      | Notes
──────────────────────────────────────────
id                | UUID      | Primary key
designationId     | UUID      | FK to DesignationMaster
permissionId      | UUID      | FK to PermissionMaster
createdAt         | DateTime  | Auto-generated

Example:
- FTM "Buyer" role has: deals.view, deals.create, reports.view
- But only if Radian granted FTM access to those permissions
```

### Route & RoutePermission
```
Route:
─────────────────────────────────────────
Column          | Type      | Notes
routeId         | UUID      | Primary key
parentRouteId   | UUID?     | For nested routes (e.g., Roles under Settings)
routeName       | String    | e.g., "Deals"
routePath       | String    | e.g., "/deals"
routeIcon       | String    | Lucide icon name
showOnSideMenu  | Boolean   | Should appear in sidebar
sortOrder       | Int       | For ordering

RoutePermission:
─────────────────────────────────────────
Column          | Type      | Notes
routePermId     | UUID      | Primary key
routeId         | UUID      | FK to Route
permissionId    | UUID      | FK to PermissionMaster
requiredAll     | Boolean   | AND vs OR logic
```

### CompanyRelationship
```
Column              | Type      | Notes
───────────────────────────────────────────
companyRelId        | UUID      | Primary key
fromCompanyId       | UUID      | FK to CompanyMaster
toCompanyId         | UUID      | FK to CompanyMaster
relationshipType    | String    | MERCHANT_SUPPLIER|BROKER_SUPPLIER
startDate           | DateTime  | When relationship started
endDate             | DateTime? | When relationship ended (if any)
createdAt           | DateTime  | Auto-generated

Example:
- From: FreshThyme, To: Coca-Cola, Type: MERCHANT_SUPPLIER
- From: ABC Brokers, To: Coca-Cola, Type: BROKER_SUPPLIER
```

---

## 🔄 Common Operations

### Getting Accessible Routes for Sidebar
```typescript
// 1. Get permissions from SessionContext
const permissions = currentContext.permissions;

// 2. Call API to filter routes
const response = await fetch('/api/routes', {
  method: 'POST',
  body: JSON.stringify({ permissions }),
});
const routes = await response.json();

// 3. Filter to top-level only
const sidebarRoutes = routes.filter(r => r.showOnSideMenu && !r.parentRouteId);

// 4. Render in sidebar
sidebarRoutes.map(route => (
  <Link key={route.id} href={route.path}>
    {route.routeName}
  </Link>
))
```

### Checking Permission Before API Call
```typescript
// Server-side (API route)
async function POST(req) {
  const { userId, companyId, action } = await req.json();
  
  // Get permissions
  const permissions = await getUserPermissions(userId, companyId);
  
  // Check before proceeding
  if (!hasPermission(permissions, 'deals.create')) {
    return Response.json(
      { error: 'You cannot create deals' },
      { status: 403 }
    );
  }
  
  // Proceed with operation
  const deal = await prisma.deal.create({ ... });
  return Response.json(deal);
}
```

### Switching User Context
```typescript
// In context switcher component
const handleContextChange = async (assignment) => {
  const context: CurrentContext = {
    companyId: assignment.companyId,
    companyName: assignment.company.companyName,
    designationId: assignment.designationId,
    designationName: assignment.designation.designationName,
    permissions: assignment.designation.permissions
      .map((p: any) => p.permission.permissionKey),
    companyRelationshipId: assignment.companyRelationshipId,
    relationshipName: assignment.companyRelationship
      ? `${assignment.companyRelationship.fromCompany.companyName} ↔ ${assignment.companyRelationship.toCompany.companyName}`
      : null,
  };
  
  // Update context - triggers re-render of all subscribed components
  await setCurrentContext(context);
};
```

---

## 🚀 Adding New Features

### Adding a New Permission

1. **Add to database**:
```typescript
// In seed.ts or migration
await prisma.permissionMaster.create({
  data: {
    permissionKey: 'deals.bulk_import',
    permissionName: 'Bulk Import Deals',
    category: 'DEALS',
  }
});
```

2. **Grant to companies** (if needed):
```typescript
await prisma.companyAvailablePermission.create({
  data: {
    companyId: ftmId,
    permissionId: bulkImportPermId,
  }
});
```

3. **Use in code**:
```tsx
<PermissionGate permission="deals.bulk_import">
  <button>Bulk Import</button>
</PermissionGate>
```

### Adding a New Route

1. **Add to database**:
```typescript
await prisma.route.create({
  data: {
    routeName: 'Deal Approvals',
    routePath: '/deals/approvals',
    routeIcon: 'CheckCircle',
    showOnSideMenu: true,
    parentRouteId: dealsRouteId, // Makes it nested under Deals
  }
});
```

2. **Create page file**:
- Create `src/app/(dashboard)/deals/approvals/page.tsx`

3. **Use with permission gate**:
```tsx
<PermissionGate permission="deals.approve">
  <DealsApprovalsPage />
</PermissionGate>
```

### Adding a New Role

1. **Create designation**:
```typescript
const newRole = await prisma.designationMaster.create({
  data: {
    companyId: ftmId,
    designationName: 'Procurement Manager',
    designationDesc: 'Manages purchase orders',
  }
});
```

2. **Assign permissions**:
```typescript
// Assume FTM can use these permissions
const permissions = await prisma.companyAvailablePermission.findMany({
  where: { companyId: ftmId }
});

await Promise.all(permissions.map(p =>
  prisma.designationPermission.create({
    data: {
      designationId: newRole.id,
      permissionId: p.permissionId,
    }
  })
));
```

### Adding Multi-Company User

1. **Create or get user**:
```typescript
const user = await prisma.userMaster.findUnique({
  where: { email: 'bob@consultant.com' }
});
```

2. **Add assignments to both companies**:
```typescript
// Assignment 1: FTM as Buyer
await prisma.userCompanyAssignment.create({
  data: {
    userId: bob.id,
    companyId: ftmId,
    designationId: buyerId,
  }
});

// Assignment 2: Coke as Sales Rep (scoped to relationship)
await prisma.userCompanyAssignment.create({
  data: {
    userId: bob.id,
    companyId: cokeId,
    designationId: salesRepId,
    companyRelationshipId: ftmCokeRelationshipId,
  }
});
```

3. **Login as user** - context switcher will show both options

---

## 🧪 Testing Guidelines

### Unit Testing Permissions

```typescript
import { hasPermission, hasAnyPermission, hasAllPermissions } from '@/lib/permissions';

describe('Permission utilities', () => {
  const perms = ['deals.view', 'deals.create', 'reports.view'];
  
  test('hasPermission checks single permission', () => {
    expect(hasPermission(perms, 'deals.view')).toBe(true);
    expect(hasPermission(perms, 'deals.delete')).toBe(false);
  });
  
  test('hasAnyPermission checks OR logic', () => {
    expect(hasAnyPermission(perms, ['deals.delete', 'reports.view'])).toBe(true);
    expect(hasAnyPermission(perms, ['deals.delete', 'users.delete'])).toBe(false);
  });
  
  test('hasAllPermissions checks AND logic', () => {
    expect(hasAllPermissions(perms, ['deals.view', 'reports.view'])).toBe(true);
    expect(hasAllPermissions(perms, ['deals.view', 'deals.delete'])).toBe(false);
  });
});
```

### Integration Testing Login

```typescript
describe('Login flow', () => {
  test('User can login with correct password', async () => {
    const response = await fetch('/api/auth/callback/credentials', {
      method: 'POST',
      body: JSON.stringify({
        email: 'emily@freshthyme.com',
        password: 'password123',
        redirect: false,
      }),
    });
    
    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.user.email).toBe('emily@freshthyme.com');
  });
  
  test('User cannot login with wrong password', async () => {
    const response = await fetch('/api/auth/callback/credentials', {
      method: 'POST',
      body: JSON.stringify({
        email: 'emily@freshthyme.com',
        password: 'wrongpassword',
        redirect: false,
      }),
    });
    
    expect(response.ok).toBe(false);
  });
});
```

### E2E Testing Permission Gates

```typescript
// Using Playwright or similar
test('Super admin sees all buttons', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'rahul@radian.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  await page.goto('/deals');
  
  // All buttons should be visible
  expect(await page.locator('button:has-text("Create")').isVisible()).toBe(true);
  expect(await page.locator('button:has-text("Edit")').isVisible()).toBe(true);
  expect(await page.locator('button:has-text("Approve")').isVisible()).toBe(true);
});

test('Buyer cannot see approve button', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'emily@freshthyme.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  await page.goto('/deals');
  
  // Only allowed button visible
  expect(await page.locator('button:has-text("Create")').isVisible()).toBe(true);
  expect(await page.locator('button:has-text("Approve")').isVisible()).toBe(false);
});
```

---

## 📚 Resource Links

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [NextAuth.js Documentation](https://next-auth.js.org)
- [React Context API](https://react.dev/reference/react/useContext)
- [Tailwind CSS](https://tailwindcss.com)
- [Lucide Icons](https://lucide.dev)

---

**Last Updated**: After Prisma migration and database seeding
**Version**: 1.0.0 - Beta
**Status**: Production-ready with test data
