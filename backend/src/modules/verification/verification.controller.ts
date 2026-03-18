// ===========================================
// SmartProperty - Verification Controller
// ===========================================

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  TENANT_ONLY_ROLES,
  VERIFICATION_REVIEW_ROLES,
} from '../users/role-groups';
import {
  DocumentType,
  VerificationStatus,
} from './entities/verification.entity';
import { VerificationService } from './verification.service';

@ApiTags('Verification')
@ApiBearerAuth()
@Controller('verification')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Get('status')
  @Roles(...TENANT_ONLY_ROLES)
  @ApiOperation({ summary: 'Get tenant verification status' })
  @ApiResponse({ status: 200, description: 'Verification status retrieved' })
  async getVerificationStatus(@Req() req: any) {
    return this.verificationService.getVerificationStatus(req.user.id);
  }

  @Post('upload')
  @Roles(...TENANT_ONLY_ROLES)
  @ApiOperation({ summary: 'Upload a verification document' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        type: {
          type: 'string',
          enum: Object.values(DocumentType),
          description: 'Document type: identity or proof_of_income',
        },
      },
      required: ['file', 'type'],
    },
  })
  @ApiResponse({ status: 201, description: 'Document uploaded successfully' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      fileFilter: (_req, file, cb) => {
        const allowed = [
          'application/pdf',
          'image/jpeg',
          'image/png',
          'image/webp',
        ];
        if (allowed.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new Error('Only PDF, JPG, PNG, and WebP files are accepted'),
            false,
          );
        }
      },
    }),
  )
  async uploadDocument(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const type = req.body.type as DocumentType;
    if (!Object.values(DocumentType).includes(type)) {
      throw new Error(
        `Invalid document type. Must be one of: ${Object.values(DocumentType).join(', ')}`,
      );
    }
    return this.verificationService.uploadDocument(req.user.id, file, type);
  }

  @Get('documents')
  @Roles(...TENANT_ONLY_ROLES)
  @ApiOperation({ summary: 'Get all uploaded verification documents' })
  @ApiResponse({ status: 200, description: 'Documents list retrieved' })
  async getDocuments(@Req() req: any) {
    return this.verificationService.getDocuments(req.user.id);
  }

  @Delete('documents/:id')
  @Roles(...TENANT_ONLY_ROLES)
  @ApiOperation({ summary: 'Delete a verification document' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({ status: 200, description: 'Document deleted' })
  async deleteDocument(@Req() req: any, @Param('id') id: string) {
    await this.verificationService.deleteDocument(req.user.id, id);
    return { message: 'Document deleted successfully' };
  }

  @Post('submit')
  @Roles(...TENANT_ONLY_ROLES)
  @ApiOperation({ summary: 'Submit documents for verification review' })
  @ApiResponse({
    status: 200,
    description: 'Documents submitted for review',
  })
  async submitForReview(@Req() req: any) {
    return this.verificationService.submitForReview(req.user.id);
  }

  // ─── ADMIN ENDPOINTS ─────────────────────────────────

  @Get('admin/all')
  @Roles(...VERIFICATION_REVIEW_ROLES)
  @ApiOperation({ summary: 'Get all verification requests (Admin)' })
  @ApiResponse({ status: 200, description: 'All verifications retrieved' })
  async getAllVerifications(@Query('status') status?: VerificationStatus) {
    return this.verificationService.getAllVerifications(status);
  }

  @Post('admin/:id/approve')
  @Roles(...VERIFICATION_REVIEW_ROLES)
  @ApiOperation({ summary: 'Approve a tenant verification (Admin)' })
  @ApiParam({ name: 'id', description: 'Verification ID' })
  @ApiResponse({ status: 200, description: 'Verification approved' })
  async approveVerification(@Param('id') id: string) {
    return this.verificationService.approveVerification(id);
  }

  @Post('admin/:id/reject')
  @Roles(...VERIFICATION_REVIEW_ROLES)
  @ApiOperation({ summary: 'Reject a tenant verification (Admin)' })
  @ApiParam({ name: 'id', description: 'Verification ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Rejection reason' },
      },
      required: ['reason'],
    },
  })
  @ApiResponse({ status: 200, description: 'Verification rejected' })
  async rejectVerification(
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.verificationService.rejectVerification(id, reason);
  }
}
