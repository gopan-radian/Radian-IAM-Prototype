# Radian Platform Prototype 🚀

A comprehensive multi-tenant SaaS platform demonstrating role-based access control, dynamic menus, and permission management built with Next.js, Prisma, and NextAuth.js.

## ✨ Features

- **Role-Based Access Control (RBAC)**: Users see different menus based on their permissions
- **Multi-Company Support**: Companies can have different permission levels
- **Relationship Scoping**: Users can be scoped to specific company relationships
- **Permission Management**: Radian controls what permissions each company can use
- **Dynamic UI**: Buttons and pages are hidden/shown based on user permissions
- **Context Switching**: Multi-company users can switch between their different roles

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: SQLite (file-based via Prisma)
- **ORM**: Prisma 7
- **Authentication**: NextAuth.js 5 (Credentials Provider)
- **UI**: Tailwind CSS + Lucide Icons
- **State Management**: React Context

## 📋 Project Structure

```
radian-platform/
├── prisma/
│   ├── schema.prisma              # Database schema
│   ├── seed.ts                    # Seed data with example users
│   ├── dev.db                     # SQLite database
│   └── migrations/                # Database migrations
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/             # Login page
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx         # Dashboard layout with sidebar
│   │   │   ├── dashboard/         # Home page
│   │   │   ├── deals/             # Deals management
│   │   │   ├── reports/           # Reports & analytics
│   │   │   ├── settings/          # Settings (users & roles)
│   │   │   └── admin/             # Admin pages (Radian only)
│   │   ├── api/
│   │   │   ├── auth/[...nextauth] # NextAuth API route
│   │   │   └── routes/            # Permission-based routes API
│   │   ├── layout.tsx             # Root layout
│   │   └── page.tsx               # Root page (redirects to login/dashboard)
│   ├── components/
│   │   ├── sidebar.tsx            # Navigation sidebar
│   │   ├── context-switcher.tsx   # Multi-company context switcher
│   │   └── permission-gate.tsx    # Permission-based component wrapper
│   ├── contexts/
│   │   └── session-context.tsx    # User session & permissions context
│   ├── lib/
│   │   ├── prisma.ts             # Prisma client instance
│   │   ├── auth.ts               # NextAuth configuration
│   │   └── permissions.ts        # Permission utilities
│   └── types/
├── .env.local                    # Environment variables
├── package.json
├── prisma.config.ts              # Prisma 7 configuration
├── tsconfig.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation & Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Generate Prisma Client**:
   ```bash
   npx prisma generate
   ```

3. **Run database migrations** (already synced):
   ```bash
   npx prisma migrate dev
   ```

4. **Seed the database**:
   ```bash
   npx prisma db seed
   ```

5. **Start the development server**:
   ```bash
   npm run dev
   ```

6. **Open your browser**:
   Navigate to http://localhost:3000

## 🧪 Test Credentials

All test users use password: `password123`

### Radian (Platform Owner)
- **rahul@radian.com** - Super Admin (full access to all features)
- **priya@radian.com** - Account Manager (can manage company permissions)
- **amit@radian.com** - Support Specialist (read-only access)

### FreshThyme (Merchant)
- **john@freshthyme.com** - Admin (full company access)
- **sarah@freshthyme.com** - Category Manager (deals + reports)
- **emily@freshthyme.com** - Buyer (limited access)

### Coca-Cola (Supplier)
- **lisa@coke.com** - Sales Manager (all relationships)
- **mike@coke.com** - Sales Rep (FTM only)
- **david@coke.com** - Sales Rep (Kroger only)

### KeHE Distributors (Non-Client Supplier)
- **amy@kehe.com** - Admin (minimal permissions)
- **james@kehe.com** - Coordinator (view-only)

### ABC Brokers
- **tom@abcbrokers.com** - Deal Coordinator (multiple suppliers)

### Multi-Company
- **bob@consultant.com** - Works at FTM + Coke (context switcher test)

## 🔐 Key Features Explained

### 1. **Role-Based Access Control**

Each user has a role within a company, which determines their permissions:

```typescript
// Example: Check if user can create deals
<PermissionGate permission="deals.create">
  <button>Create Deal</button>
</PermissionGate>
```

### 2. **Context Switching**

Multi-company users can switch between their different roles:

```typescript
// Located in the top-right of the dashboard
// Click to select different company/role combinations
<ContextSwitcher />
```

### 3. **Permission Categories**

- **DEALS**: Create, edit, approve deals
- **REPORTS**: View and export reports
- **USERS**: Manage company users
- **SETTINGS**: Manage roles and company settings
- **ADMIN**: Radian-only features (manage all companies, grant permissions)

### 4. **Company Relationship Scoping**

Some users are scoped to specific relationships (e.g., Mike only sees FTM↔Coke deals):

- Mike @ Coke: Sales Rep scoped to FTM↔Coke
- David @ Coke: Sales Rep scoped to Kroger↔Coke
- Tom @ ABC Brokers: Handles 3 different supplier relationships

## 📊 Database Schema Highlights

### Core Models

- **CompanyMaster**: Companies (Radian, merchants, suppliers, brokers)
- **UserMaster**: Users with hashed passwords
- **DesignationMaster**: Roles within companies
- **UserCompanyAssignment**: Maps users to companies + roles (with optional relationship scoping)
- **PermissionMaster**: All available permissions
- **CompanyAvailablePermission**: What permissions Radian has granted to each company
- **DesignationPermission**: What permissions each role has
- **Route**: Navigation routes with permission requirements

### Permission Flow

1. **Radian grants** permissions to companies (CompanyAvailablePermission)
2. **Companies assign** granted permissions to roles (DesignationPermission)
3. **Users are assigned** roles within companies (UserCompanyAssignment)
4. **UI checks** user's permissions and shows/hides accordingly

## 🎯 Test Scenarios

### Scenario 1: Different Menus for Different Roles

1. Login as **rahul@radian.com** (Super Admin)
   - See all menu items (Dashboard, Deals, Reports, Settings, Admin)
2. Logout and login as **emily@freshthyme.com** (Buyer)
   - See only: Dashboard, Deals (create), Reports (view)

### Scenario 2: Context Switching

1. Login as **bob@consultant.com**
2. See context switcher with FTM and Coke options
3. Click "Coke (FTM↔Coke)" to see Coke Sales Rep permissions
4. Click "FTM" to go back to FTM Buyer permissions

### Scenario 3: Permission-Gated Buttons

1. Login as **emily@freshthyme.com** (Buyer)
2. Go to Deals page
3. Notice "Create Deal" button is NOT visible (she can create)
4. Notice "Edit" button IS visible
5. Notice "Approve" button is NOT visible (she can't approve)

### Scenario 4: Admin-Only Pages

1. Login as **rahul@radian.com** (Super Admin)
2. See "Companies", "Company Permissions", "Relationships" in sidebar
3. Logout and login as **john@freshthyme.com** (FTM Admin)
4. These admin pages are NOT in the sidebar
5. Trying to navigate directly shows "Access Denied"

## 🔧 Development Commands

```bash
# Install dependencies
npm install

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev --name <migration_name>

# Seed the database
npx prisma db seed

# Reset database (warning: deletes all data)
npx prisma migrate reset

# Start dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## 📝 Key Files to Understand

### Authentication Flow
- `src/lib/auth.ts`: NextAuth configuration and login logic
- `src/app/(auth)/login/page.tsx`: Login UI with test user list

### Permission System
- `src/lib/permissions.ts`: Utility functions for checking permissions
- `src/components/permission-gate.tsx`: Component for conditional rendering

### Session Management
- `src/contexts/session-context.tsx`: Stores user's current context and permissions
- `src/app/(dashboard)/layout.tsx`: Loads session and renders sidebar

### Navigation
- `src/components/sidebar.tsx`: Renders accessible routes based on permissions
- `src/app/api/routes/route.ts`: API endpoint to get filtered routes

## 🚀 Production Deployment

Before deploying:

1. Update `.env.local` with production values:
   ```
   NEXTAUTH_SECRET="your-prod-secret-key"
   NEXTAUTH_URL="https://yourdomain.com"
   DATABASE_URL="file:/path/to/prod.db"
   ```

2. Build the application:
   ```bash
   npm run build
   npm start
   ```

3. Ensure database is properly migrated and seeded

## 🎓 Learning Resources

This prototype demonstrates:

- **Next.js App Router** with nested layouts and route groups
- **Prisma ORM** with SQLite and relationships
- **NextAuth.js** with custom credentials provider
- **React Context** for state management
- **Permission-based UI** patterns
- **Multi-tenant SaaS** architecture concepts

## 💡 Future Enhancements

- [ ] Role creation/editing UI
- [ ] User invitation system
- [ ] Deal management CRUD
- [ ] Report generation
- [ ] Audit logging
- [ ] Password reset
- [ ] Email verification
- [ ] API tokens for third-party integrations

## 📞 Support

For issues or questions, refer to:
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [NextAuth.js Documentation](https://next-auth.js.org)

---

**Built with ❤️ as a comprehensive RBAC prototype**
