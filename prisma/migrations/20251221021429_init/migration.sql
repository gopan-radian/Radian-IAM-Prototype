-- CreateTable
CREATE TABLE "company_master" (
    "company_id" TEXT NOT NULL PRIMARY KEY,
    "company_name" TEXT NOT NULL,
    "company_type" TEXT NOT NULL,
    "company_status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "is_client" BOOLEAN NOT NULL DEFAULT false,
    "terms_and_conditions_file" TEXT,
    "training_content_file" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "company_relationship" (
    "company_relationship_id" TEXT NOT NULL PRIMARY KEY,
    "from_company_id" TEXT NOT NULL,
    "to_company_id" TEXT NOT NULL,
    "relationship_type" TEXT NOT NULL,
    "relationship_status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "company_relationship_from_company_id_fkey" FOREIGN KEY ("from_company_id") REFERENCES "company_master" ("company_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "company_relationship_to_company_id_fkey" FOREIGN KEY ("to_company_id") REFERENCES "company_master" ("company_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_master" (
    "user_id" TEXT NOT NULL PRIMARY KEY,
    "first_name" TEXT NOT NULL,
    "middle_name" TEXT,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "designation_master" (
    "designation_id" TEXT NOT NULL PRIMARY KEY,
    "company_id" TEXT NOT NULL,
    "designation_name" TEXT NOT NULL,
    "designation_status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "designation_master_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company_master" ("company_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_company_assignments" (
    "user_company_assignment_id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "designation_id" TEXT NOT NULL,
    "company_relationship_id" TEXT,
    "assignment_status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "user_company_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_master" ("user_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "user_company_assignments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company_master" ("company_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "user_company_assignments_designation_id_fkey" FOREIGN KEY ("designation_id") REFERENCES "designation_master" ("designation_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "user_company_assignments_company_relationship_id_fkey" FOREIGN KEY ("company_relationship_id") REFERENCES "company_relationship" ("company_relationship_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "permission_master" (
    "permission_id" TEXT NOT NULL PRIMARY KEY,
    "permission_key" TEXT NOT NULL,
    "permission_description" TEXT NOT NULL,
    "permission_category" TEXT NOT NULL,
    "permission_status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "company_available_permissions" (
    "company_available_permission_id" TEXT NOT NULL PRIMARY KEY,
    "company_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "granted_by_user_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "company_available_permissions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company_master" ("company_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "company_available_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permission_master" ("permission_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "company_available_permissions_granted_by_user_id_fkey" FOREIGN KEY ("granted_by_user_id") REFERENCES "user_master" ("user_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "designation_permissions" (
    "designation_permission_id" TEXT NOT NULL PRIMARY KEY,
    "designation_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "designation_permissions_designation_id_fkey" FOREIGN KEY ("designation_id") REFERENCES "designation_master" ("designation_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "designation_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permission_master" ("permission_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "routes" (
    "route_id" TEXT NOT NULL PRIMARY KEY,
    "route_path" TEXT NOT NULL,
    "route_label" TEXT NOT NULL,
    "route_description" TEXT,
    "show_on_side_menu" BOOLEAN NOT NULL DEFAULT true,
    "route_icon" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "parent_route_id" TEXT,
    "route_status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "routes_parent_route_id_fkey" FOREIGN KEY ("parent_route_id") REFERENCES "routes" ("route_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "route_permissions" (
    "route_permission_id" TEXT NOT NULL PRIMARY KEY,
    "route_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "route_permissions_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "routes" ("route_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "route_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permission_master" ("permission_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "user_master_email_key" ON "user_master"("email");

-- CreateIndex
CREATE UNIQUE INDEX "permission_master_permission_key_key" ON "permission_master"("permission_key");

-- CreateIndex
CREATE UNIQUE INDEX "company_available_permissions_company_id_permission_id_key" ON "company_available_permissions"("company_id", "permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "designation_permissions_designation_id_permission_id_key" ON "designation_permissions"("designation_id", "permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "routes_route_path_key" ON "routes"("route_path");

-- CreateIndex
CREATE UNIQUE INDEX "route_permissions_route_id_permission_id_key" ON "route_permissions"("route_id", "permission_id");
