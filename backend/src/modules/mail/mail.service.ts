// ===========================================
// Mail Service
// ===========================================

import { MailerService } from '@nestjs-modules/mailer';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Send welcome email with verification link
   */
  async sendWelcomeEmail(
    email: string,
    data: { firstName: string; verificationLink: string },
  ): Promise<void> {
    try {
      const appUrl =
        this.configService.get<string>('app.frontendUrl') ||
        'http://localhost:5173';
      await this.mailerService.sendMail({
        to: email,
        subject: 'Welcome to SmartProperty!',
        template: 'welcome',
        context: {
          firstName: data.firstName,
          appUrl,
          email,
          year: new Date().getFullYear(),
        },
      });
      this.logger.log(`Welcome email sent to: ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${email}`, error);
      throw error;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    email: string,
    data: { firstName: string; resetLink: string },
  ): Promise<void> {
    try {
      const appUrl =
        this.configService.get<string>('app.frontendUrl') ||
        'http://localhost:5173';
      await this.mailerService.sendMail({
        to: email,
        subject: 'Reset your SmartProperty password',
        template: 'reset-password',
        context: {
          firstName: data.firstName,
          resetUrl: data.resetLink,
          resetLink: data.resetLink,
          appUrl,
          email,
          year: new Date().getFullYear(),
          expiresIn: 60, // 60 minutes
        },
      });
      this.logger.log(`Password reset email sent to: ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${email}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Send generic email
   */
  async sendEmail(
    to: string,
    subject: string,
    template: string,
    context: any,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to,
        subject,
        template,
        context,
      });
      this.logger.log(`Email sent to: ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error);
      throw error;
    }
  }
}
