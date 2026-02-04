// ===========================================
// Auth Controller Tests
// ===========================================

import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dtos';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            logout: jest.fn(),
            refreshToken: jest.fn(),
            requestPasswordReset: jest.fn(),
            resetPassword: jest.fn(),
            changePassword: jest.fn(),
            verifyEmail: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should call auth service register method', async () => {
      const registerDto: RegisterDto = {
        email: 'test@example.com',
        password: 'Test@1234',
        firstName: 'John',
        lastName: 'Doe',
      };

      const mockResult = {
        user: { email: 'test@example.com' },
        tokens: { accessToken: 'token', refreshToken: 'refresh' },
      };

      (service.register as jest.Mock).mockResolvedValue(mockResult);

      const result = await controller.register(registerDto);

      expect(service.register).toHaveBeenCalledWith(registerDto);
      expect(result).toEqual(mockResult);
    });
  });

  describe('login', () => {
    it('should call auth service login method', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'Test@1234',
      };

      const mockResult = {
        user: { email: 'test@example.com' },
        tokens: { accessToken: 'token', refreshToken: 'refresh' },
      };

      (service.login as jest.Mock).mockResolvedValue(mockResult);

      const result = await controller.login(loginDto);

      expect(service.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual(mockResult);
    });
  });

  describe('logout', () => {
    it('should call auth service logout method', async () => {
      const user = { userId: '123', email: 'test@example.com' };

      (service.logout as jest.Mock).mockResolvedValue(undefined);

      const result = await controller.logout(user);

      expect(service.logout).toHaveBeenCalledWith('123');
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });

  describe('forgotPassword', () => {
    it('should call auth service requestPasswordReset method', async () => {
      const forgotPasswordDto = { email: 'test@example.com' };

      (service.requestPasswordReset as jest.Mock).mockResolvedValue(undefined);

      const result = await controller.forgotPassword(forgotPasswordDto);

      expect(service.requestPasswordReset).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(result.message).toBeDefined();
    });
  });

  describe('refreshToken', () => {
    it('should call auth service refreshToken method', async () => {
      const refreshTokenDto = { refreshToken: 'refresh_token' };
      const mockTokens = {
        accessToken: 'new_token',
        refreshToken: 'new_refresh',
        expiresIn: 3600,
      };

      (service.refreshToken as jest.Mock).mockResolvedValue(mockTokens);

      const result = await controller.refreshToken(refreshTokenDto);

      expect(service.refreshToken).toHaveBeenCalledWith('refresh_token');
      expect(result).toEqual(mockTokens);
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user', async () => {
      const user = { userId: '123', email: 'test@example.com', role: 'tenant' };

      const result = await controller.getCurrentUser(user);

      expect(result).toEqual(user);
    });
  });
});
