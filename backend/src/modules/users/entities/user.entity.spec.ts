import { ObjectId } from 'mongodb';
import {
  User,
  UserRole,
  UserStatus,
  AuthProvider,
} from './user.entity';

describe('User Entity', () => {
  let user: User;

  beforeEach(() => {
    user = new User();
    user._id = new ObjectId();
    user.email = 'test@example.com';
    user.firstName = 'John';
    user.lastName = 'Doe';
    user.role = UserRole.TENANT;
    user.status = UserStatus.ACTIVE;
    user.authProvider = AuthProvider.LOCAL;
    user.isEmailVerified = false;
    user.twoFactorEnabled = false;
    user.loginAttempts = 0;
    user.permanentlyDeleted = false;
    user.mustChangePassword = false;
    user.createdAt = new Date();
    user.updatedAt = new Date();
  });

  describe('virtual properties', () => {
    it('id returns hex string of _id', () => {
      expect(user.id).toBe(user._id.toHexString());
    });

    it('fullName concatenates first and last name', () => {
      expect(user.fullName).toBe('John Doe');
    });

    it('isLocked returns false when no lockUntil', () => {
      expect(user.isLocked).toBe(false);
    });

    it('isLocked returns true when lockUntil is in the future', () => {
      user.lockUntil = new Date(Date.now() + 60000);
      expect(user.isLocked).toBe(true);
    });

    it('isLocked returns false when lockUntil is in the past', () => {
      user.lockUntil = new Date(Date.now() - 60000);
      expect(user.isLocked).toBe(false);
    });
  });

  describe('incrementLoginAttempts', () => {
    it('increments login attempts', () => {
      user.incrementLoginAttempts();
      expect(user.loginAttempts).toBe(1);
    });

    it('locks account after 5 failed attempts', () => {
      for (let i = 0; i < 5; i++) {
        user.incrementLoginAttempts();
      }
      expect(user.loginAttempts).toBe(5);
      expect(user.lockUntil).toBeDefined();
      expect(user.lockUntil!.getTime()).toBeGreaterThan(Date.now());
    });

    it('resets attempts when lock has expired', () => {
      user.loginAttempts = 4;
      user.lockUntil = new Date(Date.now() - 60000);

      user.incrementLoginAttempts();

      expect(user.loginAttempts).toBe(1);
      expect(user.lockUntil).toBeUndefined();
    });
  });

  describe('resetLoginAttempts', () => {
    it('resets attempts and sets lastLogin', () => {
      user.loginAttempts = 3;
      user.lockUntil = new Date();

      user.resetLoginAttempts();

      expect(user.loginAttempts).toBe(0);
      expect(user.lockUntil).toBeUndefined();
      expect(user.lastLogin).toBeInstanceOf(Date);
    });
  });

  describe('password methods', () => {
    it('validatePassword returns false when no password set', async () => {
      user.password = undefined;
      const result = await user.validatePassword('any');
      expect(result).toBe(false);
    });

    it('setPassword hashes the password', async () => {
      await user.setPassword('MyPassword123!');
      expect(user.password).toBeDefined();
      expect(user.password).not.toBe('MyPassword123!');
      expect(user.password!.startsWith('$2b$')).toBe(true);
    });

    it('validatePassword returns true for correct password', async () => {
      await user.setPassword('MyPassword123!');
      const result = await user.validatePassword('MyPassword123!');
      expect(result).toBe(true);
    });

    it('validatePassword returns false for wrong password', async () => {
      await user.setPassword('MyPassword123!');
      const result = await user.validatePassword('WrongPassword');
      expect(result).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('returns serialized user without sensitive fields', () => {
      user.password = 'hashed';
      user.refreshToken = 'token';

      const json = user.toJSON();

      expect(json.id).toBe(user.id);
      expect(json.email).toBe(user.email);
      expect(json.firstName).toBe(user.firstName);
      expect(json.lastName).toBe(user.lastName);
      expect(json.fullName).toBe('John Doe');
      expect(json.role).toBe(UserRole.TENANT);
      expect(json.status).toBe(UserStatus.ACTIVE);
      expect((json as any).password).toBeUndefined();
      expect((json as any).refreshToken).toBeUndefined();
    });
  });

  describe('enums', () => {
    it('UserRole has all expected values', () => {
      expect(UserRole.SUPER_ADMIN).toBe('super_admin');
      expect(UserRole.BRANCH_MANAGER).toBe('branch_manager');
      expect(UserRole.REAL_ESTATE_AGENT).toBe('real_estate_agent');
      expect(UserRole.RENTAL_MANAGER).toBe('rental_manager');
      expect(UserRole.OWNER).toBe('owner');
      expect(UserRole.TENANT).toBe('tenant');
      expect(UserRole.SERVICE_PROVIDER).toBe('service_provider');
    });

    it('UserStatus has all expected values', () => {
      expect(UserStatus.ACTIVE).toBe('active');
      expect(UserStatus.INACTIVE).toBe('inactive');
      expect(UserStatus.SUSPENDED).toBe('suspended');
      expect(UserStatus.PENDING_VERIFICATION).toBe('pending_verification');
    });

    it('AuthProvider has all expected values', () => {
      expect(AuthProvider.LOCAL).toBe('local');
      expect(AuthProvider.GOOGLE).toBe('google');
      expect(AuthProvider.FACEBOOK).toBe('facebook');
    });
  });
});
