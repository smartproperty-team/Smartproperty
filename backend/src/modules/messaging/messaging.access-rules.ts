// ===========================================
// SmartProperty - Messaging Role Rules
// ===========================================

import { UserRole } from '../users/entities/user.entity';

export interface RoleAccessRule {
  canChatWith: UserRole[];
}

/**
 * Role-Based Messaging Access Matrix
 *
 * Allowed conversations per role:
 * - Tenant ↔ Real Estate Agent / Manager
 * - Tenant ↔ Rental Manager
 * - Rental Manager ↔ Owner
 * - Real Estate Agent / Manager ↔ Branch Manager
 * - Real Estate Agent / Manager ↔ Owner
 * - Branch Manager ↔ Super Administrator (escalations)
 * - Service Provider ↔ Rental Manager
 * - Service Provider ↔ Real Estate Agent / Manager
 * - Support/Compliance (SUPER_ADMIN) ↔ All roles
 * - Support/Compliance (ACCOUNTANT) ↔ Super Admin, Branch Manager, Agent
 *
 * Key: Role that initiates the chat
 * Value: Array of roles that the key role can chat with
 */
export const MESSAGING_ACCESS_RULES: Record<UserRole, RoleAccessRule> = {
  [UserRole.TENANT]: {
    // Tenant can chat with Real Estate Agent and Rental Manager
    canChatWith: [UserRole.REAL_ESTATE_AGENT, UserRole.RENTAL_MANAGER],
  },
  [UserRole.REAL_ESTATE_AGENT]: {
    // Real Estate Agent can chat with: Tenant, Rental Manager, Branch Manager, Owner, Service Provider
    canChatWith: [
      UserRole.TENANT,
      UserRole.RENTAL_MANAGER,
      UserRole.BRANCH_MANAGER,
      UserRole.OWNER,
      UserRole.SERVICE_PROVIDER,
    ],
  },
  [UserRole.RENTAL_MANAGER]: {
    // Rental Manager can chat with: Tenant, Owner, Service Provider, Real Estate Agent
    canChatWith: [
      UserRole.TENANT,
      UserRole.OWNER,
      UserRole.SERVICE_PROVIDER,
      UserRole.REAL_ESTATE_AGENT,
    ],
  },
  [UserRole.OWNER]: {
    // Owner can chat with: Rental Manager, Real Estate Agent
    canChatWith: [UserRole.RENTAL_MANAGER, UserRole.REAL_ESTATE_AGENT],
  },
  [UserRole.BRANCH_MANAGER]: {
    // Branch Manager can chat with: Real Estate Agent, Super Admin
    canChatWith: [UserRole.REAL_ESTATE_AGENT, UserRole.SUPER_ADMIN],
  },
  [UserRole.SERVICE_PROVIDER]: {
    // Service Provider can chat with: Rental Manager, Real Estate Agent
    canChatWith: [UserRole.RENTAL_MANAGER, UserRole.REAL_ESTATE_AGENT],
  },
  [UserRole.SUPER_ADMIN]: {
    // Super Admin (Support/Compliance) can chat with all roles for escalations and policy
    canChatWith: [
      UserRole.BRANCH_MANAGER,
      UserRole.REAL_ESTATE_AGENT,
      UserRole.RENTAL_MANAGER,
      UserRole.OWNER,
      UserRole.TENANT,
      UserRole.SERVICE_PROVIDER,
      UserRole.ACCOUNTANT_ADMIN_ASSISTANT,
    ],
  },
  [UserRole.ACCOUNTANT_ADMIN_ASSISTANT]: {
    // Compliance Reviewer can chat with: Super Admin, Branch Manager, Real Estate Agent
    canChatWith: [
      UserRole.SUPER_ADMIN,
      UserRole.BRANCH_MANAGER,
      UserRole.REAL_ESTATE_AGENT,
    ],
  },
};

/**
 * Check if one role can chat with another role
 */
export function canRolesChatWith(
  senderRole: UserRole,
  recipientRole: UserRole,
): boolean {
  const rules = MESSAGING_ACCESS_RULES[senderRole];
  if (!rules) {
    return false;
  }

  return rules.canChatWith.includes(recipientRole);
}

/**
 * Check if a message can be sent (bidirectional check)
 */
export function canSendMessage(
  senderRole: UserRole,
  recipientRole: UserRole,
): boolean {
  // Direct check
  if (canRolesChatWith(senderRole, recipientRole)) {
    return true;
  }

  // Reverse check (for backward compatibility)
  return canRolesChatWith(recipientRole, senderRole);
}

/**
 * Get allowed conversation partner roles for a given role
 */
export function getAllowedChatPartnerRoles(userRole: UserRole): UserRole[] {
  const rules = MESSAGING_ACCESS_RULES[userRole];
  return rules ? rules.canChatWith : [];
}

/**
 * Get display name for a role (for UI)
 */
export function getRoleDisplayName(role: UserRole): string {
  const displayNames: Record<UserRole, string> = {
    [UserRole.SUPER_ADMIN]: 'Support / Compliance Reviewer',
    [UserRole.BRANCH_MANAGER]: 'Branch Manager',
    [UserRole.REAL_ESTATE_AGENT]: 'Real Estate Agent / Manager',
    [UserRole.RENTAL_MANAGER]: 'Rental Manager',
    [UserRole.ACCOUNTANT_ADMIN_ASSISTANT]: 'Accountant / Compliance Assistant',
    [UserRole.OWNER]: 'Owner',
    [UserRole.TENANT]: 'Tenant / Candidate Tenant',
    [UserRole.SERVICE_PROVIDER]: 'Service Provider',
  };
  return displayNames[role] || role;
}
