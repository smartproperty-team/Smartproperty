import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { AgenciesService } from './agencies.service';
import { CreateAgencyDto } from './dto/create-agency.dto';

type CurrentBranchManager = {
  id: string;
  email?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
};

@ApiTags('Agencies')
@ApiBearerAuth()
@Controller('agencies')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AgenciesController {
  constructor(private readonly agenciesService: AgenciesService) {}

  @Post()
  @Roles(UserRole.BRANCH_MANAGER)
  @ApiOperation({
    summary: 'Create agency and provision role accounts (Branch Manager only)',
  })
  @ApiResponse({
    status: 201,
    description: 'Agency created. Accounts are created or skipped by conflict.',
  })
  createAgency(
    @Body() createAgencyDto: CreateAgencyDto,
    @CurrentUser() currentUser: CurrentBranchManager,
  ) {
    const managerName =
      currentUser.fullName?.trim() ||
      `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() ||
      'Branch Manager';

    return this.agenciesService.createWithAutoAccounts(createAgencyDto, {
      id: currentUser.id,
      email: currentUser.email,
      name: managerName,
    });
  }

  @Get('mine')
  @Roles(UserRole.BRANCH_MANAGER)
  @ApiOperation({ summary: 'List agencies created by current branch manager' })
  findMine(@CurrentUser('id') currentUserId: string) {
    return this.agenciesService.findMyAgencies(currentUserId);
  }

  @Get('search')
  @Roles(UserRole.OWNER, UserRole.BRANCH_MANAGER)
  @ApiOperation({ summary: 'Search agencies by name, region, or slug' })
  findSearch(@Query('q') query?: string) {
    return this.agenciesService.searchAgencies(query);
  }

  @Get(':id')
  @Roles(UserRole.BRANCH_MANAGER)
  @ApiOperation({ summary: 'Get agency by id' })
  findOne(@Param('id') id: string) {
    return this.agenciesService.findById(id);
  }

  @Post(':id/owners/me')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Link current owner account to an agency' })
  @ApiResponse({ status: 200, description: 'Current owner linked to agency' })
  linkCurrentOwner(
    @Param('id') id: string,
    @CurrentUser('id') currentUserId: string,
  ) {
    return this.agenciesService.linkCurrentOwner(id, currentUserId);
  }

  @Delete(':id/owners/me')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Unlink current owner account from an agency' })
  @ApiResponse({
    status: 200,
    description: 'Current owner unlinked from agency',
  })
  unlinkCurrentOwner(
    @Param('id') id: string,
    @CurrentUser('id') currentUserId: string,
  ) {
    return this.agenciesService.unlinkCurrentOwner(id, currentUserId);
  }

  @Post(':id/owners/:ownerId')
  @Roles(UserRole.BRANCH_MANAGER)
  @ApiOperation({ summary: 'Link an owner account to an agency' })
  @ApiResponse({ status: 200, description: 'Owner linked to agency' })
  linkOwner(
    @Param('id') id: string,
    @Param('ownerId') ownerId: string,
    @CurrentUser('id') currentUserId: string,
  ) {
    return this.agenciesService.linkOwner(id, ownerId, currentUserId);
  }

  @Delete(':id/owners/:ownerId')
  @Roles(UserRole.BRANCH_MANAGER)
  @ApiOperation({ summary: 'Unlink an owner account from an agency' })
  @ApiResponse({ status: 200, description: 'Owner unlinked from agency' })
  unlinkOwner(
    @Param('id') id: string,
    @Param('ownerId') ownerId: string,
    @CurrentUser('id') currentUserId: string,
  ) {
    return this.agenciesService.unlinkOwner(id, ownerId, currentUserId);
  }
}
