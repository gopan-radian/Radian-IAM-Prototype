import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';
import path from 'path';

// Load .env.local
config({ path: path.resolve(__dirname, '../.env.local') });

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ==================== PERMISSIONS ====================
  const permissions = [
    // DEALS
    { key: 'deals.view', description: 'View deals', category: 'DEALS' },
    { key: 'deals.create', description: 'Create new deals', category: 'DEALS' },
    { key: 'deals.edit', description: 'Edit existing deals', category: 'DEALS' },
    { key: 'deals.delete', description: 'Delete deals', category: 'DEALS' },
    { key: 'deals.approve', description: 'Approve/reject deals', category: 'DEALS' },
    // REPORTS
    { key: 'reports.view', description: 'View reports', category: 'REPORTS' },
    { key: 'reports.export', description: 'Export reports to CSV/PDF', category: 'REPORTS' },
    // USERS
    { key: 'users.view', description: 'View users in company', category: 'USERS' },
    { key: 'users.invite', description: 'Invite new users', category: 'USERS' },
    { key: 'users.manage', description: 'Edit/deactivate users', category: 'USERS' },
    // SETTINGS
    { key: 'roles.view', description: 'View roles', category: 'SETTINGS' },
    { key: 'roles.manage', description: 'Create/edit roles', category: 'SETTINGS' },
    { key: 'company.settings', description: 'Manage company settings', category: 'SETTINGS' },
    // ADMIN (Radian only)
    { key: 'admin.companies', description: 'Manage all companies', category: 'ADMIN' },
    { key: 'admin.company_permissions', description: 'Grant permissions to companies', category: 'ADMIN' },
    { key: 'admin.relationships', description: 'Manage company relationships', category: 'ADMIN' },
  ];

  const permissionRecords = await Promise.all(
    permissions.map((p) =>
      prisma.permissionMaster.upsert({
        where: { permissionKey: p.key },
        update: {},
        create: {
          permissionKey: p.key,
          permissionDescription: p.description,
          permissionCategory: p.category,
        },
      })
    )
  );

  console.log(`✅ Created ${permissionRecords.length} permissions`);

  // ==================== ROUTES ====================
  const routes = [
    { path: '/dashboard', label: 'Dashboard', icon: 'home', order: 1, permission: null },
    { path: '/deals', label: 'Deals', icon: 'file-text', order: 2, permission: 'deals.view' },
    { path: '/deals/create', label: 'Create Deal', icon: 'plus', order: 1, permission: 'deals.create', parent: '/deals', showOnMenu: false },
    { path: '/reports', label: 'Reports', icon: 'bar-chart', order: 3, permission: 'reports.view' },
    { path: '/reports/export', label: 'Export Center', icon: 'download', order: 1, permission: 'reports.export', parent: '/reports' },
    { path: '/settings', label: 'Settings', icon: 'settings', order: 10 },
    { path: '/settings/users', label: 'User Management', icon: 'users', order: 1, permission: 'users.view', parent: '/settings' },
    { path: '/settings/roles', label: 'Role Management', icon: 'shield', order: 2, permission: 'roles.view', parent: '/settings' },
    { path: '/admin/companies', label: 'Companies', icon: 'building', order: 20, permission: 'admin.companies' },
    { path: '/admin/company-permissions', label: 'Company Permissions', icon: 'key', order: 21, permission: 'admin.company_permissions' },
    { path: '/admin/relationships', label: 'Relationships', icon: 'link', order: 22, permission: 'admin.relationships' },
  ];

  // Create or update routes
  const routeRecords: Record<string, any> = {};
  for (const r of routes) {
    const route = await prisma.route.upsert({
      where: { routePath: r.path },
      update: {
        routeLabel: r.label,
        routeIcon: r.icon,
        displayOrder: r.order,
        showOnSideMenu: r.showOnMenu !== false,
      },
      create: {
        routePath: r.path,
        routeLabel: r.label,
        routeIcon: r.icon,
        displayOrder: r.order,
        showOnSideMenu: r.showOnMenu !== false,
      },
    });
    routeRecords[r.path] = route;
  }

  // Set parent routes
  for (const r of routes) {
    if (r.parent) {
      await prisma.route.update({
        where: { routeId: routeRecords[r.path].routeId },
        data: { parentRouteId: routeRecords[r.parent].routeId },
      });
    }
  }

  // Create route permissions
  for (const r of routes) {
    if (r.permission) {
      const permission = permissionRecords.find((p) => p.permissionKey === r.permission);
      if (permission) {
        await prisma.routePermission.upsert({
          where: { routeId_permissionId: { routeId: routeRecords[r.path].routeId, permissionId: permission.permissionId } },
          update: {},
          create: {
            routeId: routeRecords[r.path].routeId,
            permissionId: permission.permissionId,
          },
        });
      }
    }
  }

  console.log(`✅ Created ${Object.keys(routeRecords).length} routes`);

  // ==================== COMPANIES ====================
  const companies = {
    radian: await prisma.companyMaster.upsert({
      where: { companyId: 'radian-id' },
      update: {},
      create: { companyId: 'radian-id', companyName: 'Radian', companyType: 'RADIAN', isClient: false },
    }),
    freshthyme: await prisma.companyMaster.upsert({
      where: { companyId: 'ftm-id' },
      update: {},
      create: { companyId: 'ftm-id', companyName: 'FreshThyme (FTM)', companyType: 'MERCHANT', isClient: true },
    }),
    kroger: await prisma.companyMaster.upsert({
      where: { companyId: 'kroger-id' },
      update: {},
      create: { companyId: 'kroger-id', companyName: 'Kroger', companyType: 'MERCHANT', isClient: true },
    }),
    coke: await prisma.companyMaster.upsert({
      where: { companyId: 'coke-id' },
      update: {},
      create: { companyId: 'coke-id', companyName: 'Coca-Cola', companyType: 'SUPPLIER', isClient: true },
    }),
    kehe: await prisma.companyMaster.upsert({
      where: { companyId: 'kehe-id' },
      update: {},
      create: { companyId: 'kehe-id', companyName: 'KeHE Distributors', companyType: 'SUPPLIER', isClient: false },
    }),
    belvita: await prisma.companyMaster.upsert({
      where: { companyId: 'belvita-id' },
      update: {},
      create: { companyId: 'belvita-id', companyName: 'Belvita', companyType: 'SUPPLIER', isClient: true },
    }),
    abcBrokers: await prisma.companyMaster.upsert({
      where: { companyId: 'abc-id' },
      update: {},
      create: { companyId: 'abc-id', companyName: 'ABC Brokers', companyType: 'BROKER', isClient: true },
    }),
  };

  console.log(`✅ Created ${Object.keys(companies).length} companies`);

  // ==================== COMPANY RELATIONSHIPS ====================
  const relationships = {
    ftm_coke: await prisma.companyRelationship.upsert({
      where: { companyRelationshipId: 'ftm-coke-id' },
      update: {},
      create: {
        companyRelationshipId: 'ftm-coke-id',
        fromCompanyId: companies.freshthyme.companyId,
        toCompanyId: companies.coke.companyId,
        relationshipType: 'MERCHANT_SUPPLIER',
      },
    }),
    ftm_kehe: await prisma.companyRelationship.upsert({
      where: { companyRelationshipId: 'ftm-kehe-id' },
      update: {},
      create: {
        companyRelationshipId: 'ftm-kehe-id',
        fromCompanyId: companies.freshthyme.companyId,
        toCompanyId: companies.kehe.companyId,
        relationshipType: 'MERCHANT_SUPPLIER',
      },
    }),
    ftm_belvita: await prisma.companyRelationship.upsert({
      where: { companyRelationshipId: 'ftm-belvita-id' },
      update: {},
      create: {
        companyRelationshipId: 'ftm-belvita-id',
        fromCompanyId: companies.freshthyme.companyId,
        toCompanyId: companies.belvita.companyId,
        relationshipType: 'MERCHANT_SUPPLIER',
      },
    }),
    kroger_coke: await prisma.companyRelationship.upsert({
      where: { companyRelationshipId: 'kroger-coke-id' },
      update: {},
      create: {
        companyRelationshipId: 'kroger-coke-id',
        fromCompanyId: companies.kroger.companyId,
        toCompanyId: companies.coke.companyId,
        relationshipType: 'MERCHANT_SUPPLIER',
      },
    }),
    kroger_kehe: await prisma.companyRelationship.upsert({
      where: { companyRelationshipId: 'kroger-kehe-id' },
      update: {},
      create: {
        companyRelationshipId: 'kroger-kehe-id',
        fromCompanyId: companies.kroger.companyId,
        toCompanyId: companies.kehe.companyId,
        relationshipType: 'MERCHANT_SUPPLIER',
      },
    }),
    abc_coke: await prisma.companyRelationship.upsert({
      where: { companyRelationshipId: 'abc-coke-id' },
      update: {},
      create: {
        companyRelationshipId: 'abc-coke-id',
        fromCompanyId: companies.abcBrokers.companyId,
        toCompanyId: companies.coke.companyId,
        relationshipType: 'BROKER_SUPPLIER',
      },
    }),
    abc_kehe: await prisma.companyRelationship.upsert({
      where: { companyRelationshipId: 'abc-kehe-id' },
      update: {},
      create: {
        companyRelationshipId: 'abc-kehe-id',
        fromCompanyId: companies.abcBrokers.companyId,
        toCompanyId: companies.kehe.companyId,
        relationshipType: 'BROKER_SUPPLIER',
      },
    }),
    abc_belvita: await prisma.companyRelationship.upsert({
      where: { companyRelationshipId: 'abc-belvita-id' },
      update: {},
      create: {
        companyRelationshipId: 'abc-belvita-id',
        fromCompanyId: companies.abcBrokers.companyId,
        toCompanyId: companies.belvita.companyId,
        relationshipType: 'BROKER_SUPPLIER',
      },
    }),
  };

  // Clean up any old broker-merchant relationships that shouldn't exist
  await prisma.userCompanyAssignment.deleteMany({
    where: {
      companyRelationshipId: { in: ['abc-ftm-id', 'abc-kroger-id'] }
    }
  });
  await prisma.companyRelationship.deleteMany({
    where: { companyRelationshipId: { in: ['abc-ftm-id', 'abc-kroger-id'] } }
  });

  console.log(`✅ Created ${Object.keys(relationships).length} company relationships`);

  // ==================== COMPANY AVAILABLE PERMISSIONS ====================
  // Radian gets ALL permissions
  for (const p of permissionRecords) {
    await prisma.companyAvailablePermission.upsert({
      where: { companyId_permissionId: { companyId: companies.radian.companyId, permissionId: p.permissionId } },
      update: {},
      create: {
        companyId: companies.radian.companyId,
        permissionId: p.permissionId,
      },
    });
  }

  // FreshThyme gets good permissions (premium client)
  const ftmPermissions = ['deals.view', 'deals.create', 'deals.edit', 'deals.approve', 'reports.view', 'reports.export', 'users.view', 'users.invite', 'users.manage', 'roles.view', 'roles.manage'];
  for (const key of ftmPermissions) {
    const p = permissionRecords.find((p) => p.permissionKey === key);
    if (p) {
      await prisma.companyAvailablePermission.upsert({
        where: { companyId_permissionId: { companyId: companies.freshthyme.companyId, permissionId: p.permissionId } },
        update: {},
        create: {
          companyId: companies.freshthyme.companyId,
          permissionId: p.permissionId,
        },
      });
    }
  }

  // Kroger gets similar permissions
  for (const key of ftmPermissions) {
    const p = permissionRecords.find((p) => p.permissionKey === key);
    if (p) {
      await prisma.companyAvailablePermission.upsert({
        where: { companyId_permissionId: { companyId: companies.kroger.companyId, permissionId: p.permissionId } },
        update: {},
        create: {
          companyId: companies.kroger.companyId,
          permissionId: p.permissionId,
        },
      });
    }
  }

  // Coke gets limited permissions (no export)
  const cokePermissions = ['deals.view', 'deals.create', 'deals.edit', 'reports.view', 'users.view', 'users.invite', 'roles.view'];
  for (const key of cokePermissions) {
    const p = permissionRecords.find((p) => p.permissionKey === key);
    if (p) {
      await prisma.companyAvailablePermission.upsert({
        where: { companyId_permissionId: { companyId: companies.coke.companyId, permissionId: p.permissionId } },
        update: {},
        create: {
          companyId: companies.coke.companyId,
          permissionId: p.permissionId,
        },
      });
    }
  }

  // KeHE gets supplier permissions (non-client but still a supplier)
  const kehePermissions = ['deals.view', 'deals.create', 'deals.edit', 'reports.view'];
  for (const key of kehePermissions) {
    const p = permissionRecords.find((p) => p.permissionKey === key);
    if (p) {
      await prisma.companyAvailablePermission.upsert({
        where: { companyId_permissionId: { companyId: companies.kehe.companyId, permissionId: p.permissionId } },
        update: {},
        create: {
          companyId: companies.kehe.companyId,
          permissionId: p.permissionId,
        },
      });
    }
  }

  // Belvita
  for (const key of cokePermissions) {
    const p = permissionRecords.find((p) => p.permissionKey === key);
    if (p) {
      await prisma.companyAvailablePermission.upsert({
        where: { companyId_permissionId: { companyId: companies.belvita.companyId, permissionId: p.permissionId } },
        update: {},
        create: {
          companyId: companies.belvita.companyId,
          permissionId: p.permissionId,
        },
      });
    }
  }

  // ABC Brokers
  const brokerPermissions = ['deals.view', 'deals.create', 'deals.edit', 'reports.view', 'users.view'];
  for (const key of brokerPermissions) {
    const p = permissionRecords.find((p) => p.permissionKey === key);
    if (p) {
      await prisma.companyAvailablePermission.upsert({
        where: { companyId_permissionId: { companyId: companies.abcBrokers.companyId, permissionId: p.permissionId } },
        update: {},
        create: {
          companyId: companies.abcBrokers.companyId,
          permissionId: p.permissionId,
        },
      });
    }
  }

  console.log('✅ Assigned company available permissions');

  // ==================== DESIGNATIONS (ROLES) ====================
  const designations = {
    // Radian roles
    radianSuperAdmin: await prisma.designationMaster.upsert({
      where: { designationId: 'radian-super-admin' },
      update: {},
      create: { designationId: 'radian-super-admin', companyId: companies.radian.companyId, designationName: 'Super Admin' },
    }),
    radianAccountManager: await prisma.designationMaster.upsert({
      where: { designationId: 'radian-account-mgr' },
      update: {},
      create: { designationId: 'radian-account-mgr', companyId: companies.radian.companyId, designationName: 'Account Manager' },
    }),
    radianSupport: await prisma.designationMaster.upsert({
      where: { designationId: 'radian-support' },
      update: {},
      create: { designationId: 'radian-support', companyId: companies.radian.companyId, designationName: 'Support Specialist' },
    }),
    // FreshThyme roles
    ftmAdmin: await prisma.designationMaster.upsert({
      where: { designationId: 'ftm-admin' },
      update: {},
      create: { designationId: 'ftm-admin', companyId: companies.freshthyme.companyId, designationName: 'Admin' },
    }),
    ftmCategoryManager: await prisma.designationMaster.upsert({
      where: { designationId: 'ftm-cat-mgr' },
      update: {},
      create: { designationId: 'ftm-cat-mgr', companyId: companies.freshthyme.companyId, designationName: 'Category Manager' },
    }),
    ftmBuyer: await prisma.designationMaster.upsert({
      where: { designationId: 'ftm-buyer' },
      update: {},
      create: { designationId: 'ftm-buyer', companyId: companies.freshthyme.companyId, designationName: 'Buyer' },
    }),
    // Coke roles
    cokeAdmin: await prisma.designationMaster.upsert({
      where: { designationId: 'coke-admin' },
      update: {},
      create: { designationId: 'coke-admin', companyId: companies.coke.companyId, designationName: 'Admin' },
    }),
    cokeSalesManager: await prisma.designationMaster.upsert({
      where: { designationId: 'coke-sales-mgr' },
      update: {},
      create: { designationId: 'coke-sales-mgr', companyId: companies.coke.companyId, designationName: 'Sales Manager' },
    }),
    cokeSalesRep: await prisma.designationMaster.upsert({
      where: { designationId: 'coke-sales-rep' },
      update: {},
      create: { designationId: 'coke-sales-rep', companyId: companies.coke.companyId, designationName: 'Sales Rep' },
    }),
    // KeHE roles (minimal)
    keheAdmin: await prisma.designationMaster.upsert({
      where: { designationId: 'kehe-admin' },
      update: {},
      create: { designationId: 'kehe-admin', companyId: companies.kehe.companyId, designationName: 'Admin' },
    }),
    keheCoordinator: await prisma.designationMaster.upsert({
      where: { designationId: 'kehe-coord' },
      update: {},
      create: { designationId: 'kehe-coord', companyId: companies.kehe.companyId, designationName: 'Coordinator' },
    }),
    // ABC Brokers roles
    abcAdmin: await prisma.designationMaster.upsert({
      where: { designationId: 'abc-admin' },
      update: {},
      create: { designationId: 'abc-admin', companyId: companies.abcBrokers.companyId, designationName: 'Admin' },
    }),
    abcDealCoordinator: await prisma.designationMaster.upsert({
      where: { designationId: 'abc-deal-coord' },
      update: {},
      create: { designationId: 'abc-deal-coord', companyId: companies.abcBrokers.companyId, designationName: 'Deal Coordinator' },
    }),
  };

  console.log(`✅ Created ${Object.keys(designations).length} designations (roles)`);

  // ==================== DESIGNATION PERMISSIONS ====================
  const assignPermissionsToRole = async (designationId: string, permissionKeys: string[]) => {
    for (const key of permissionKeys) {
      const p = permissionRecords.find((p) => p.permissionKey === key);
      if (p) {
        await prisma.designationPermission.upsert({
          where: { designationId_permissionId: { designationId, permissionId: p.permissionId } },
          update: {},
          create: { designationId, permissionId: p.permissionId },
        });
      }
    }
  };

  // Radian Super Admin - ALL permissions
  await assignPermissionsToRole(designations.radianSuperAdmin.designationId, permissions.map((p) => p.key));

  // Radian Account Manager
  await assignPermissionsToRole(designations.radianAccountManager.designationId, [
    'deals.view', 'deals.create', 'deals.edit', 'deals.approve',
    'reports.view', 'reports.export',
    'users.view', 'users.invite',
    'admin.companies', 'admin.company_permissions', 'admin.relationships',
  ]);

  // Radian Support
  await assignPermissionsToRole(designations.radianSupport.designationId, [
    'deals.view', 'reports.view', 'users.view',
  ]);

  // FTM Admin
  await assignPermissionsToRole(designations.ftmAdmin.designationId, ftmPermissions);

  // FTM Category Manager
  await assignPermissionsToRole(designations.ftmCategoryManager.designationId, [
    'deals.view', 'deals.create', 'deals.edit', 'deals.approve',
    'reports.view', 'reports.export',
  ]);

  // FTM Buyer
  await assignPermissionsToRole(designations.ftmBuyer.designationId, [
    'deals.view', 'deals.create', 'reports.view',
  ]);

  // Coke Admin
  await assignPermissionsToRole(designations.cokeAdmin.designationId, cokePermissions);

  // Coke Sales Manager
  await assignPermissionsToRole(designations.cokeSalesManager.designationId, [
    'deals.view', 'deals.create', 'deals.edit', 'reports.view', 'users.view',
  ]);

  // Coke Sales Rep
  await assignPermissionsToRole(designations.cokeSalesRep.designationId, [
    'deals.view', 'deals.create',
  ]);

  // KeHE Admin
  await assignPermissionsToRole(designations.keheAdmin.designationId, kehePermissions);

  // KeHE Coordinator - can create and edit deals
  await assignPermissionsToRole(designations.keheCoordinator.designationId, ['deals.view', 'deals.create', 'deals.edit']);

  // ABC Brokers Admin
  await assignPermissionsToRole(designations.abcAdmin.designationId, brokerPermissions);

  // ABC Deal Coordinator
  await assignPermissionsToRole(designations.abcDealCoordinator.designationId, [
    'deals.view', 'deals.create', 'deals.edit',
  ]);

  console.log('✅ Assigned permissions to roles');

  // ==================== USERS ====================
  const hashedPassword = await bcrypt.hash('password123', 10);

  const users = {
    // Radian Users
    rahul: await prisma.userMaster.upsert({
      where: { email: 'rahul@radian.com' },
      update: {},
      create: { userId: 'rahul-id', firstName: 'Rahul', lastName: 'Sharma', email: 'rahul@radian.com', password: hashedPassword },
    }),
    priya: await prisma.userMaster.upsert({
      where: { email: 'priya@radian.com' },
      update: {},
      create: { userId: 'priya-id', firstName: 'Priya', lastName: 'Patel', email: 'priya@radian.com', password: hashedPassword },
    }),
    amit: await prisma.userMaster.upsert({
      where: { email: 'amit@radian.com' },
      update: {},
      create: { userId: 'amit-id', firstName: 'Amit', lastName: 'Kumar', email: 'amit@radian.com', password: hashedPassword },
    }),
    // FreshThyme Users
    john: await prisma.userMaster.upsert({
      where: { email: 'john@freshthyme.com' },
      update: {},
      create: { userId: 'john-id', firstName: 'John', lastName: 'Smith', email: 'john@freshthyme.com', password: hashedPassword },
    }),
    sarah: await prisma.userMaster.upsert({
      where: { email: 'sarah@freshthyme.com' },
      update: {},
      create: { userId: 'sarah-id', firstName: 'Sarah', lastName: 'Johnson', email: 'sarah@freshthyme.com', password: hashedPassword },
    }),
    emily: await prisma.userMaster.upsert({
      where: { email: 'emily@freshthyme.com' },
      update: {},
      create: { userId: 'emily-id', firstName: 'Emily', lastName: 'Davis', email: 'emily@freshthyme.com', password: hashedPassword },
    }),
    // Coke Users
    mike: await prisma.userMaster.upsert({
      where: { email: 'mike@coke.com' },
      update: {},
      create: { userId: 'mike-id', firstName: 'Mike', lastName: 'Williams', email: 'mike@coke.com', password: hashedPassword },
    }),
    lisa: await prisma.userMaster.upsert({
      where: { email: 'lisa@coke.com' },
      update: {},
      create: { userId: 'lisa-id', firstName: 'Lisa', lastName: 'Brown', email: 'lisa@coke.com', password: hashedPassword },
    }),
    david: await prisma.userMaster.upsert({
      where: { email: 'david@coke.com' },
      update: {},
      create: { userId: 'david-id', firstName: 'David', lastName: 'Miller', email: 'david@coke.com', password: hashedPassword },
    }),
    // KeHE Users
    amy: await prisma.userMaster.upsert({
      where: { email: 'amy@kehe.com' },
      update: {},
      create: { userId: 'amy-id', firstName: 'Amy', lastName: 'Wilson', email: 'amy@kehe.com', password: hashedPassword },
    }),
    james: await prisma.userMaster.upsert({
      where: { email: 'james@kehe.com' },
      update: {},
      create: { userId: 'james-id', firstName: 'James', lastName: 'Taylor', email: 'james@kehe.com', password: hashedPassword },
    }),
    // ABC Brokers Users
    tom: await prisma.userMaster.upsert({
      where: { email: 'tom@abcbrokers.com' },
      update: {},
      create: { userId: 'tom-id', firstName: 'Tom', lastName: 'Anderson', email: 'tom@abcbrokers.com', password: hashedPassword },
    }),
    // Multi-company user (consultant)
    bob: await prisma.userMaster.upsert({
      where: { email: 'bob@consultant.com' },
      update: {},
      create: { userId: 'bob-id', firstName: 'Bob', lastName: 'Consultant', email: 'bob@consultant.com', password: hashedPassword },
    }),
  };

  console.log(`✅ Created ${Object.keys(users).length} users`);

  // ==================== USER COMPANY ASSIGNMENTS ====================
  const assignments = [
    { user: users.rahul, company: companies.radian, designation: designations.radianSuperAdmin, id: 'uca-rahul' },
    { user: users.priya, company: companies.radian, designation: designations.radianAccountManager, id: 'uca-priya' },
    { user: users.amit, company: companies.radian, designation: designations.radianSupport, id: 'uca-amit' },
    
    { user: users.john, company: companies.freshthyme, designation: designations.ftmAdmin, id: 'uca-john' },
    { user: users.sarah, company: companies.freshthyme, designation: designations.ftmCategoryManager, id: 'uca-sarah' },
    { user: users.emily, company: companies.freshthyme, designation: designations.ftmBuyer, id: 'uca-emily' },
    
    { user: users.lisa, company: companies.coke, designation: designations.cokeSalesManager, id: 'uca-lisa' },
    { user: users.mike, company: companies.coke, designation: designations.cokeSalesRep, id: 'uca-mike', relationship: relationships.ftm_coke },
    { user: users.david, company: companies.coke, designation: designations.cokeSalesRep, id: 'uca-david', relationship: relationships.kroger_coke },
    
    { user: users.amy, company: companies.kehe, designation: designations.keheAdmin, id: 'uca-amy' },
    { user: users.james, company: companies.kehe, designation: designations.keheCoordinator, id: 'uca-james' },
    
    // Tom's supplier relationships - brokers represent suppliers and can manage their deals
    { user: users.tom, company: companies.abcBrokers, designation: designations.abcDealCoordinator, id: 'uca-tom-1', relationship: relationships.abc_coke },
    { user: users.tom, company: companies.abcBrokers, designation: designations.abcDealCoordinator, id: 'uca-tom-2', relationship: relationships.abc_kehe },
    { user: users.tom, company: companies.abcBrokers, designation: designations.abcDealCoordinator, id: 'uca-tom-3', relationship: relationships.abc_belvita },
    
    { user: users.bob, company: companies.freshthyme, designation: designations.ftmBuyer, id: 'uca-bob-1' },
    { user: users.bob, company: companies.coke, designation: designations.cokeSalesRep, id: 'uca-bob-2', relationship: relationships.ftm_coke },
  ];

  for (const a of assignments) {
    await prisma.userCompanyAssignment.upsert({
      where: { userCompanyAssignmentId: a.id },
      update: {},
      create: {
        userCompanyAssignmentId: a.id,
        userId: a.user.userId,
        companyId: a.company.companyId,
        designationId: a.designation.designationId,
        companyRelationshipId: a.relationship?.companyRelationshipId || null,
      },
    });
  }

  console.log(`✅ Created ${assignments.length} user company assignments`);

  // ==================== DEAL TYPES & PHASES ====================
  // First, delete old deal types that are no longer needed
  await prisma.dealHistory.deleteMany({
    where: {
      deal: {
        dealType: {
          dealTypeId: { in: ['deal-type-po', 'deal-type-contract', 'deal-type-promo'] }
        }
      }
    }
  });
  await prisma.dealParticipant.deleteMany({
    where: {
      deal: {
        dealType: {
          dealTypeId: { in: ['deal-type-po', 'deal-type-contract', 'deal-type-promo'] }
        }
      }
    }
  });
  await prisma.deal.deleteMany({
    where: {
      dealType: {
        dealTypeId: { in: ['deal-type-po', 'deal-type-contract', 'deal-type-promo'] }
      }
    }
  });
  await prisma.dealPhase.deleteMany({
    where: { dealTypeId: { in: ['deal-type-po', 'deal-type-contract', 'deal-type-promo'] } }
  });
  await prisma.dealType.deleteMany({
    where: { dealTypeId: { in: ['deal-type-po', 'deal-type-contract', 'deal-type-promo'] } }
  });

  const dealTypes = {
    fundedPromotion: await prisma.dealType.upsert({
      where: { dealTypeId: 'deal-type-funded-promo' },
      update: {},
      create: {
        dealTypeId: 'deal-type-funded-promo',
        dealTypeName: 'Funded Promotion',
        dealTypeDescription: 'Supplier funds the promotion amount, merchant may contribute additional funding',
      },
    }),
    nonFundedPromotion: await prisma.dealType.upsert({
      where: { dealTypeId: 'deal-type-non-funded-promo' },
      update: {},
      create: {
        dealTypeId: 'deal-type-non-funded-promo',
        dealTypeName: 'Non-Funded Promotion',
        dealTypeDescription: 'Promotion fully funded by merchant, no supplier contribution',
      },
    }),
    deal: await prisma.dealType.upsert({
      where: { dealTypeId: 'deal-type-deal' },
      update: {},
      create: {
        dealTypeId: 'deal-type-deal',
        dealTypeName: 'Deal',
        dealTypeDescription: 'General deals and agreements between supplier and merchant',
      },
    }),
  };

  console.log(`✅ Created ${Object.keys(dealTypes).length} deal types`);

  // Create phases for each deal type
  const phaseDefinitions = [
    { name: 'DRAFT', order: 1, description: 'Deal is being drafted by supplier' },
    { name: 'PENDING_REVIEW', order: 2, description: 'Awaiting merchant review' },
    { name: 'CHANGES_REQUESTED', order: 3, description: 'Merchant requested changes' },
    { name: 'APPROVED', order: 4, description: 'Deal approved by merchant' },
    { name: 'REJECTED', order: 5, description: 'Deal rejected by merchant' },
    { name: 'IN_PROGRESS', order: 6, description: 'Deal is being executed' },
    { name: 'COMPLETED', order: 7, description: 'Deal completed successfully' },
  ];

  for (const dealType of Object.values(dealTypes)) {
    for (const phase of phaseDefinitions) {
      await prisma.dealPhase.upsert({
        where: {
          dealPhaseId: `${dealType.dealTypeId}-${phase.name.toLowerCase()}`,
        },
        update: {},
        create: {
          dealPhaseId: `${dealType.dealTypeId}-${phase.name.toLowerCase()}`,
          dealTypeId: dealType.dealTypeId,
          phaseName: phase.name,
          phaseOrder: phase.order,
          phaseDescription: phase.description,
        },
      });
    }
  }

  console.log(`✅ Created ${Object.keys(dealTypes).length * phaseDefinitions.length} deal phases`);

  // ==================== SAMPLE DEALS ====================
  const sampleDeals = [
    {
      id: 'deal-001',
      number: 'DEAL-00001',
      typeId: dealTypes.fundedPromotion.dealTypeId,
      phaseId: `${dealTypes.fundedPromotion.dealTypeId}-pending_review`,
      relationshipId: relationships.ftm_coke.companyRelationshipId,
      ownerId: companies.coke.companyId,
      counterpartyId: companies.freshthyme.companyId,
      title: 'Summer Beverage Promotion 2024',
      description: 'Coca-Cola funded promotion - 20% discount on all products for summer season. Supplier contribution: $50,000',
      amount: 50000,
      createdBy: users.lisa.userId,
    },
    {
      id: 'deal-002',
      number: 'DEAL-00002',
      typeId: dealTypes.nonFundedPromotion.dealTypeId,
      phaseId: `${dealTypes.nonFundedPromotion.dealTypeId}-draft`,
      relationshipId: relationships.ftm_belvita.companyRelationshipId,
      ownerId: companies.belvita.companyId,
      counterpartyId: companies.freshthyme.companyId,
      title: 'Belvita Breakfast Week',
      description: 'Non-funded promotion - FreshThyme to run in-store promotion for Belvita products',
      amount: 0,
      createdBy: users.bob.userId,
    },
    {
      id: 'deal-003',
      number: 'DEAL-00003',
      typeId: dealTypes.fundedPromotion.dealTypeId,
      phaseId: `${dealTypes.fundedPromotion.dealTypeId}-approved`,
      relationshipId: relationships.kroger_coke.companyRelationshipId,
      ownerId: companies.coke.companyId,
      counterpartyId: companies.kroger.companyId,
      title: 'Holiday Special - Kroger',
      description: 'Funded promotion - Special holiday pricing for Kroger stores. Supplier contribution: $75,000',
      amount: 75000,
      createdBy: users.david.userId,
    },
    {
      id: 'deal-004',
      number: 'DEAL-00004',
      typeId: dealTypes.deal.dealTypeId,
      phaseId: `${dealTypes.deal.dealTypeId}-changes_requested`,
      relationshipId: relationships.ftm_coke.companyRelationshipId,
      ownerId: companies.coke.companyId,
      counterpartyId: companies.freshthyme.companyId,
      title: 'New Product Launch - Coke Zero Sugar',
      description: 'General deal for new product launch coordination and shelf placement',
      amount: 35000,
      createdBy: users.mike.userId,
    },
  ];

  for (const deal of sampleDeals) {
    await prisma.deal.upsert({
      where: { dealId: deal.id },
      update: {},
      create: {
        dealId: deal.id,
        dealNumber: deal.number,
        dealTypeId: deal.typeId,
        currentPhaseId: deal.phaseId,
        companyRelationshipId: deal.relationshipId,
        ownerCompanyId: deal.ownerId,
        counterpartyCompanyId: deal.counterpartyId,
        dealTitle: deal.title,
        dealDescription: deal.description,
        dealAmount: deal.amount,
        dealCurrency: 'USD',
        createdByUserId: deal.createdBy,
      },
    });

    // Add creator as participant
    await prisma.dealParticipant.upsert({
      where: {
        dealId_userId_companyId: {
          dealId: deal.id,
          userId: deal.createdBy,
          companyId: deal.ownerId,
        },
      },
      update: {},
      create: {
        dealId: deal.id,
        userId: deal.createdBy,
        companyId: deal.ownerId,
        participantRole: 'OWNER',
      },
    });

    // Create history entry
    await prisma.dealHistory.upsert({
      where: { dealHistoryId: `${deal.id}-created` },
      update: {},
      create: {
        dealHistoryId: `${deal.id}-created`,
        dealId: deal.id,
        actionType: 'CREATED',
        newPhaseId: deal.phaseId,
        changedByUserId: deal.createdBy,
        changedByCompanyId: deal.ownerId,
        changeDescription: `Deal created: ${deal.title}`,
      },
    });
  }

  console.log(`✅ Created ${sampleDeals.length} sample deals`);

  console.log('\n🎉 Seeding complete!\n');
  console.log('📋 TEST USERS (all passwords: "password123"):');
  console.log('─'.repeat(60));
  console.log('RADIAN:');
  console.log('  rahul@radian.com     → Super Admin (full access)');
  console.log('  priya@radian.com     → Account Manager');
  console.log('  amit@radian.com      → Support (read-only)');
  console.log('─'.repeat(60));
  console.log('FRESHTHYME (Merchant):');
  console.log('  john@freshthyme.com  → Admin');
  console.log('  sarah@freshthyme.com → Category Manager');
  console.log('  emily@freshthyme.com → Buyer (limited)');
  console.log('─'.repeat(60));
  console.log('COCA-COLA (Supplier):');
  console.log('  lisa@coke.com        → Sales Manager (all relationships)');
  console.log('  mike@coke.com        → Sales Rep (FTM only)');
  console.log('  david@coke.com       → Sales Rep (Kroger only)');
  console.log('─'.repeat(60));
  console.log('KEHE (Non-client Supplier):');
  console.log('  amy@kehe.com         → Admin (minimal permissions)');
  console.log('  james@kehe.com       → Coordinator (view only)');
  console.log('─'.repeat(60));
  console.log('ABC BROKERS:');
  console.log('  tom@abcbrokers.com   → Deal Coordinator (multiple suppliers)');
  console.log('─'.repeat(60));
  console.log('MULTI-COMPANY:');
  console.log('  bob@consultant.com   → Works at FTM + Coke');
  console.log('─'.repeat(60));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
