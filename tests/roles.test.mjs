import test from "node:test";
import assert from "node:assert/strict";
import { canManageUser, isAdminRole, roleLabel } from "../src/lib/roles.js";

const superAdmin = { username: "Boss", role: "super_admin" };
const admin = { username: "helper", role: "admin" };
const user = (username = "sam", role = "user") => ({ username, role });

test("isAdminRole / roleLabel", () => {
  assert.equal(isAdminRole("admin"), true);
  assert.equal(isAdminRole("super_admin"), true);
  assert.equal(isAdminRole("user"), false);
  assert.equal(isAdminRole(undefined), false);
  assert.equal(roleLabel("super_admin"), "Super admin");
  assert.equal(roleLabel("user"), "Member");
});

test("admin can manage regular users only", () => {
  assert.equal(canManageUser(admin, user()).allowed, true);
  assert.equal(canManageUser(admin, user("other", "admin")).allowed, false);
  assert.equal(canManageUser(admin, user("boss2", "super_admin")).allowed, false);
});

test("super admin can manage users and admins, never the super admin or themselves", () => {
  assert.equal(canManageUser(superAdmin, user()).allowed, true);
  assert.equal(canManageUser(superAdmin, user("helper", "admin")).allowed, true);
  assert.equal(canManageUser(superAdmin, user("boss", "user")).allowed, false); // self (case-insensitive)
  assert.equal(canManageUser(superAdmin, user("x", "super_admin")).allowed, false);
});

test("nobody manages their own account", () => {
  assert.equal(canManageUser(admin, user("HELPER", "admin")).allowed, false);
});
