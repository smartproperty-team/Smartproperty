import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
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
    @CurrentUser('id') currentUserId: string,
  ) {
    return this.agenciesService.createWithAutoAccounts(
      createAgencyDto,
      currentUserId,
    );
  }

  @Get('mine')
  @Roles(UserRole.BRANCH_MANAGER)
  @ApiOperation({ summary: 'List agencies created by current branch manager' })
  findMine(@CurrentUser('id') currentUserId: string) {
    return this.agenciesService.findMyAgencies(currentUserId);
  }

  @Get(':id')
  @Roles(UserRole.BRANCH_MANAGER)
  @ApiOperation({ summary: 'Get agency by id' })
  findOne(@Param('id') id: string) {
    return this.agenciesService.findById(id);
  }
}
