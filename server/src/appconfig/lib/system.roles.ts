/**
 * 系统保留的用户组
 */
export const systemRoles = {
    root: "ROOT",
    user: "USER",

    isSystem(role: string): boolean {
        return role === systemRoles.root || role === systemRoles.user;
    },
};
