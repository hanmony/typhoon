import { SetMetadata } from "@nestjs/common";
import { RoleType } from "src/security/domain/role.type";

export const ROLES_KEY = "auth-roles";
export const Roles = (...roles: RoleType[]) => SetMetadata(ROLES_KEY, roles);
