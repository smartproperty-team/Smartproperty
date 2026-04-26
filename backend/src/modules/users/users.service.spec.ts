import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ObjectId } from 'mongodb';
import { User, UserRole, UserStatus } from './entities/user.entity';
import { UsersService } from './users.service';

const mockObjectId = new ObjectId();

function createMockUser(overrides: Partial<User> = {}): User {
  const user = new User();
  user._id = mockObjectId;
  user.email = 'test@example.com';
  user.firstName = 'John';
  user.lastName = 'Doe';
  user.role = UserRole.TENANT;
  user.status = UserStatus.ACTIVE;
  user.preferences = undefined;
  user.toJSON = jest.fn().mockReturnValue({
    id: mockObjectId.toHexString(),
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.TENANT,
  });
  Object.assign(user, overrides);
  return user;
}

const mockMongoRepository = {
  find: jest.fn(),
  countDocuments: jest.fn(),
};

const mockRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  count: jest.fn(),
  remove: jest.fn(),
  manager: {
    getMongoRepository: jest.fn().mockReturnValue(mockMongoRepository),
  },
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createUserDto = {
      email: 'Test@Example.com',
      password: 'Password123!',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should create a user with lowercase email', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      const mockUser = createMockUser();
      mockRepository.create.mockReturnValue(mockUser);
      mockRepository.save.mockResolvedValue(mockUser);

      const result = await service.create(createUserDto);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          role: UserRole.TENANT,
        }),
      );
      expect(result).toBe(mockUser);
    });

    it('should throw ConflictException if email already exists', async () => {
      mockRepository.findOne.mockResolvedValue(createMockUser());

      await expect(service.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should use specified role when provided', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      const mockUser = createMockUser({ role: UserRole.OWNER });
      mockRepository.create.mockReturnValue(mockUser);
      mockRepository.save.mockResolvedValue(mockUser);

      await service.create({ ...createUserDto, role: UserRole.OWNER });

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: UserRole.OWNER }),
      );
    });
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      const mockUser = createMockUser();
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findById(mockObjectId.toHexString());
      expect(result).toBe(mockUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findById(new ObjectId().toHexString()),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for invalid ObjectId', async () => {
      await expect(service.findById('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByEmail', () => {
    it('should return user by lowercase email', async () => {
      const mockUser = createMockUser();
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail('Test@Example.COM');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(result).toBe(mockUser);
    });

    it('should return null when user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('nobody@test.com');
      expect(result).toBeNull();
    });
  });

  describe('findByRole', () => {
    it('should return users with specified role', async () => {
      const mockUsers = [createMockUser(), createMockUser()];
      mockRepository.find.mockResolvedValue(mockUsers);

      const result = await service.findByRole(UserRole.TENANT);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { role: UserRole.TENANT },
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(2);
    });
  });

  describe('findAll', () => {
    it('should return paginated users with defaults', async () => {
      const mockUsers = [createMockUser()];
      mockMongoRepository.find.mockResolvedValue(mockUsers);
      mockMongoRepository.countDocuments.mockResolvedValue(1);

      const result = await service.findAll();

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(1);
      expect(result.users).toHaveLength(1);
    });

    it('should filter by role', async () => {
      mockMongoRepository.find.mockResolvedValue([]);
      mockMongoRepository.countDocuments.mockResolvedValue(0);

      await service.findAll({ role: UserRole.OWNER });

      expect(mockMongoRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ role: UserRole.OWNER }),
        }),
      );
    });

    it('should filter by status', async () => {
      mockMongoRepository.find.mockResolvedValue([]);
      mockMongoRepository.countDocuments.mockResolvedValue(0);

      await service.findAll({ status: UserStatus.ACTIVE });

      expect(mockMongoRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: UserStatus.ACTIVE }),
        }),
      );
    });

    it('should handle search with regex', async () => {
      mockMongoRepository.find.mockResolvedValue([]);
      mockMongoRepository.countDocuments.mockResolvedValue(0);

      await service.findAll({ search: 'john' });

      expect(mockMongoRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            $or: expect.any(Array),
          }),
        }),
      );
    });

    it('should cap limit at 100', async () => {
      mockMongoRepository.find.mockResolvedValue([]);
      mockMongoRepository.countDocuments.mockResolvedValue(0);

      const result = await service.findAll({ limit: 500 });
      expect(result.limit).toBe(100);
    });
  });

  describe('update', () => {
    it('should update user fields', async () => {
      const mockUser = createMockUser();
      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.save.mockResolvedValue(mockUser);

      await service.update(mockObjectId.toHexString(), {
        firstName: 'Jane',
      });

      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe('getPreferences', () => {
    it('should return default preferences when user has none', async () => {
      const mockUser = createMockUser({ preferences: undefined });
      mockRepository.findOne.mockResolvedValue(mockUser);

      const prefs = await service.getPreferences(mockObjectId.toHexString());

      expect(prefs.language).toBe('en');
      expect(prefs.timezone).toBe('UTC');
      expect(prefs.notifications?.email).toBe(true);
    });

    it('should merge user preferences with defaults', async () => {
      const mockUser = createMockUser({
        preferences: { language: 'fr' },
      });
      mockRepository.findOne.mockResolvedValue(mockUser);

      const prefs = await service.getPreferences(mockObjectId.toHexString());

      expect(prefs.language).toBe('fr');
      expect(prefs.timezone).toBe('UTC');
    });
  });

  describe('updatePreferences', () => {
    it('should merge new preferences with existing', async () => {
      const mockUser = createMockUser({ preferences: { language: 'en' } });
      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.save.mockResolvedValue(mockUser);

      await service.updatePreferences(mockObjectId.toHexString(), {
        language: 'fr',
      });

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          preferences: expect.objectContaining({ language: 'fr' }),
        }),
      );
    });
  });

  describe('updateStatus', () => {
    it('should update user status', async () => {
      const mockUser = createMockUser();
      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.save.mockResolvedValue(mockUser);

      await service.updateStatus(
        mockObjectId.toHexString(),
        UserStatus.SUSPENDED,
      );

      expect(mockUser.status).toBe(UserStatus.SUSPENDED);
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe('updateRole', () => {
    it('should update user role', async () => {
      const mockUser = createMockUser();
      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.save.mockResolvedValue(mockUser);

      await service.updateRole(mockObjectId.toHexString(), UserRole.OWNER);

      expect(mockUser.role).toBe(UserRole.OWNER);
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should remove the user', async () => {
      const mockUser = createMockUser();
      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.remove.mockResolvedValue(undefined);

      await service.delete(mockObjectId.toHexString());

      expect(mockRepository.remove).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('softDelete', () => {
    it('should mark user as inactive with deletedAt', async () => {
      const mockUser = createMockUser();
      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.save.mockResolvedValue(mockUser);

      await service.softDelete(mockObjectId.toHexString());

      expect(mockUser.status).toBe(UserStatus.INACTIVE);
      expect(mockUser.deletedAt).toBeInstanceOf(Date);
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe('permanentDelete', () => {
    it('should anonymize all personal information', async () => {
      const mockUser = createMockUser({
        phone: '+1234567890',
        avatar: 'avatar.jpg',
        password: 'hashed',
        refreshToken: 'token',
        twoFactorSecret: 'secret',
        preferences: { language: 'en', timezone: 'UTC' },
      });
      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.save.mockResolvedValue(mockUser);

      await service.permanentDelete(mockObjectId.toHexString());

      expect(mockUser.firstName).toBe('[Deleted User]');
      expect(mockUser.phone).toBeUndefined();
      expect(mockUser.avatar).toBeUndefined();
      expect(mockUser.password).toBeUndefined();
      expect(mockUser.refreshToken).toBeUndefined();
      expect(mockUser.twoFactorSecret).toBeUndefined();
      expect(mockUser.permanentlyDeleted).toBe(true);
      expect(mockUser.status).toBe(UserStatus.INACTIVE);
      expect(mockUser.preferences).toEqual({ language: 'en', timezone: 'UTC' });
    });
  });
});
