// ===========================================
// SmartProperty - Users Controller
// ===========================================

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole, UserStatus } from './entities/user.entity';
import type { FindUsersOptions, UpdateUserDto } from './users.service';
import { UsersService } from './users.service';

// ===========================================
// Users Controller
// ===========================================

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ===========================================
  // List Users (Admin only)
  // ===========================================

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  @ApiQuery({ name: 'status', required: false, enum: UserStatus })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'List of users',
  })
  async findAll(@Query() options: FindUsersOptions) {
    return this.usersService.findAll(options);
  }

  // ===========================================
  // Get User Stats (Admin only)
  // ===========================================

  @Get('stats')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get user statistics (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'User statistics',
  })
  async getStats() {
    return this.usersService.getUserStats();
  }

  // ===========================================
  // Get Current User Profile
  // ===========================================

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile',
  })
  async getProfile(@CurrentUser('id') userId: string) {
    const user = await this.usersService.findById(userId);
    return user.toJSON();
  }

  // ===========================================
  // Update Current User Profile
  // ===========================================

  @Put('profile')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
  })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const user = await this.usersService.update(userId, updateUserDto);
    return user.toJSON();
  }

  // ===========================================
  // Deactivate Current User Account
  // ===========================================

  @Delete('deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate current user account' })
  @ApiResponse({
    status: 200,
    description: 'Account deactivated successfully',
  })
  async deactivateCurrentUser(@CurrentUser('id') userId: string) {
    await this.usersService.softDelete(userId);
    return { message: 'Account deactivated successfully' };
  }

  // ===========================================
  // Permanently Delete Account (GDPR Compliance)
  // ===========================================

  @Delete('permanent-delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Permanently delete user account with GDPR compliance (anonymizes PII)',
  })
  @ApiResponse({
    status: 200,
    description:
      'Account deleted successfully. All personal data has been anonymized.',
  })
  async permanentlyDeleteCurrentUser(@CurrentUser('id') userId: string) {
    await this.usersService.permanentDelete(userId);
    return {
      message:
        'Account permanently deleted. All personal data has been anonymized.',
    };
  }

  // ===========================================
  // Get User by ID (Admin or self)
  // ===========================================

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({
    status: 200,
    description: 'User data',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async findOne(@Param('id') id: string, @CurrentUser() currentUser: any) {
    // Users can only view their own profile unless they're admin
    if (currentUser.role !== UserRole.ADMIN && currentUser.id !== id) {
      const user = await this.usersService.findById(currentUser.id);
      return user.toJSON();
    }

    const user = await this.usersService.findById(id);
    return user.toJSON();
  }

  // ===========================================
  // Update User (Admin only)
  // ===========================================

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update user (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
  })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    const user = await this.usersService.update(id, updateUserDto);
    return user.toJSON();
  }

  // ===========================================
  // Update User Status (Admin only)
  // ===========================================

  @Put(':id/status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update user status (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Status updated successfully',
  })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: UserStatus,
  ) {
    const user = await this.usersService.updateStatus(id, status);
    return user.toJSON();
  }

  // ===========================================
  // Update User Role (Admin only)
  // ===========================================

  @Put(':id/role')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update user role (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Role updated successfully',
  })
  async updateRole(@Param('id') id: string, @Body('role') role: UserRole) {
    const user = await this.usersService.updateRole(id, role);
    return user.toJSON();
  }

  // ===========================================
  // Delete User (Admin only)
  // ===========================================

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete user (Admin only)' })
  @ApiResponse({
    status: 204,
    description: 'User deleted successfully',
  })
  async delete(@Param('id') id: string) {
    await this.usersService.softDelete(id);
  }
}
