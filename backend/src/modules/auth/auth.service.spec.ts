// ===========================================
// Auth Service Tests
// ===========================================

import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';

import { User } from '../../common/entities';
import { MailService } from '../mail/mail.service';
import { UserService } from '../users/user.service';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dtos';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: any;
  let jwtService: JwtService;
  let configService: ConfigService;
  let mailService: MailService;
  let userService: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, any> = {
                'jwt.secret': 'test-secret',
                'jwt.refreshSecret': 'test-refresh-secret',
                'jwt.expiresIn': '1d',
                'jwt.refreshExpiresIn': '7d',
                'app.frontendUrl': 'http://localhost:3000',
              };
              return config[key];
            }),
          },
        },
        {
          provide: MailService,
          useValue: {
            sendWelcomeEmail: jest.fn(),
            sendPasswordResetEmail: jest.fn(),
          },
        },
        {
          provide: UserService,
          useValue: {
            getUserById: jest.fn(),
            getUserByEmail: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(getRepositoryToken(User));
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
    mailService = module.get<MailService>(MailService);
    userService = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const registerDto: RegisterDto = {
        email: 'test@example.com',
        password: 'Test@1234',
        firstName: 'John',
        lastName: 'Doe',
      };

      const mockUser = {
        _id: '123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'tenant',
      };

      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockReturnValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      jwtService.sign.mockReturnValue('token');

      const result = await service.register(registerDto);

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.tokens).toBeDefined();
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should throw error if email already exists', async () => {
      const registerDto: RegisterDto = {
        email: 'test@example.com',
        password: 'Test@1234',
        firstName: 'John',
        lastName: 'Doe',
      };

      const mockExistingUser = { _id: '123', email: 'test@example.com' };

      userRepository.findOne.mockResolvedValue(mockExistingUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'Test@1234',
      };

      const mockUser = {
        _id: '123',
        email: 'test@example.com',
        password: 'hashed_password',
        firstName: 'John',
        lastName: 'Doe',
        role: 'tenant',
        isActive: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      userRepository.update.mockResolvedValue({ affected: 1 });
      jwtService.sign.mockReturnValue('token');

      const result = await service.login(loginDto);

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.tokens).toBeDefined();
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'Test@1234',
        'hashed_password',
      );
    });

    it('should throw error if user not found', async () => {
      const loginDto: LoginDto = {
        email: 'nonexistent@example.com',
        password: 'Test@1234',
      };

      userRepository.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw error if password is incorrect', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'WrongPassword123',
      };

      const mockUser = {
        _id: '123',
        email: 'test@example.com',
        password: 'hashed_password',
        firstName: 'John',
        failedLoginAttempts: 0,
        lockedUntil: null,
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should lock account after max login attempts', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'WrongPassword',
      };

      const mockUser = {
        _id: '123',
        email: 'test@example.com',
        password: 'hashed_password',
        failedLoginAttempts: 4, // 5th attempt will lock
        lockedUntil: null,
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(userRepository.update).toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const changePasswordDto = {
        oldPassword: 'Test@1234',
        newPassword: 'NewTest@1234',
      };

      const mockUser = {
        _id: '123',
        email: 'test@example.com',
        password: 'hashed_old_password',
      };

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_new_password');
      userRepository.findOne.mockResolvedValue(mockUser);

      await service.changePassword('123', changePasswordDto);

      expect(userRepository.update).toHaveBeenCalledWith('123', {
        password: 'hashed_new_password',
      });
    });

    it('should throw error if old password is incorrect', async () => {
      const changePasswordDto = {
        oldPassword: 'WrongPassword',
        newPassword: 'NewTest@1234',
      };

      const mockUser = {
        _id: '123',
        email: 'test@example.com',
        password: 'hashed_old_password',
      };

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      userRepository.findOne.mockResolvedValue(mockUser);

      await expect(
        service.changePassword('123', changePasswordDto),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      await service.logout('123');

      expect(userRepository.update).toHaveBeenCalledWith('123', {
        refreshToken: null,
        refreshTokenExpiresAt: null,
      });
    });
  });
});
