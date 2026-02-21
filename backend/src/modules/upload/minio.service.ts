// ===========================================
// SmartProperty - MinIO Storage Service
// ===========================================

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { Client } from 'minio';

export interface UploadedFile {
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
  key: string;
}

export interface UploadOptions {
  folder?: string;
  fileName?: string;
  contentType?: string;
  metadata?: Record<string, string>;
}

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private minioClient: Client;
  private bucketName: string;
  private publicUrl: string;

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get<string>('minio.endpoint') || 'localhost';
    const port = this.configService.get<number>('minio.port') || 9000;
    const useSSL = this.configService.get<boolean>('minio.useSSL') || false;
    const accessKey = this.configService.get<string>('minio.accessKey') || 'minioadmin';
    const secretKey = this.configService.get<string>('minio.secretKey') || 'minioadmin';

    this.bucketName =
      this.configService.get<string>('minio.bucketName') || 'smartproperty';
    this.publicUrl =
      this.configService.get<string>('minio.publicUrl') ||
      `http://${endpoint}:${port}`;

    this.minioClient = new Client({
      endPoint: endpoint,
      port: port,
      useSSL: useSSL,
      accessKey: accessKey,
      secretKey: secretKey,
    });

    this.logger.log(`MinIO client configured for ${endpoint}:${port}`);
  }

  async onModuleInit(): Promise<void> {
    await this.ensureBucketExists();
  }

  private async ensureBucketExists(): Promise<void> {
    try {
      const exists = await this.minioClient.bucketExists(this.bucketName);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucketName);
        this.logger.log(`Bucket '${this.bucketName}' created`);

        // Set public read policy
        const policy = {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { AWS: ['*'] },
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${this.bucketName}/*`],
            },
          ],
        };
        await this.minioClient.setBucketPolicy(
          this.bucketName,
          JSON.stringify(policy),
        );
        this.logger.log(
          `Public read policy set for bucket '${this.bucketName}'`,
        );
      } else {
        this.logger.log(`Bucket '${this.bucketName}' already exists`);
      }
    } catch (error) {
      this.logger.error(`Failed to ensure bucket exists: ${error}`);
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    options: UploadOptions = {},
  ): Promise<UploadedFile> {
    const folder = options.folder || 'uploads';
    const extension = this.getFileExtension(file.originalname);
    const fileName = options.fileName || `${randomUUID()}${extension}`;
    const key = `${folder}/${fileName}`;

    const metadata: Record<string, string> = {
      'Content-Type': file.mimetype,
      'Original-Name': encodeURIComponent(file.originalname),
      ...options.metadata,
    };

    await this.minioClient.putObject(
      this.bucketName,
      key,
      file.buffer,
      file.size,
      metadata,
    );

    const url = `${this.publicUrl}/${this.bucketName}/${key}`;

    this.logger.log(`File uploaded: ${key}`);

    return {
      originalName: file.originalname,
      fileName,
      mimeType: file.mimetype,
      size: file.size,
      url,
      key,
    };
  }

  async uploadFiles(
    files: Express.Multer.File[],
    options: UploadOptions = {},
  ): Promise<UploadedFile[]> {
    const uploadPromises = files.map((file) => this.uploadFile(file, options));
    return Promise.all(uploadPromises);
  }

  async deleteFile(key: string): Promise<void> {
    await this.minioClient.removeObject(this.bucketName, key);
    this.logger.log(`File deleted: ${key}`);
  }

  async deleteFiles(keys: string[]): Promise<void> {
    // `removeObjects` expects an array of object names (string[])
    await this.minioClient.removeObjects(this.bucketName, keys);
    this.logger.log(`${keys.length} files deleted`);
  }

  async getPresignedUrl(key: string, expirySeconds?: number): Promise<string> {
    const expiry =
      expirySeconds ||
      this.configService.get<number>('minio.presignedUrlExpiry') ||
      3600;
    return await this.minioClient.presignedGetObject(
      this.bucketName,
      key,
      expiry,
    );
  }

  async getPresignedUploadUrl(
    key: string,
    expirySeconds?: number,
  ): Promise<string> {
    const expiry =
      expirySeconds ||
      this.configService.get<number>('minio.presignedUrlExpiry') ||
      3600;
    return await this.minioClient.presignedPutObject(
      this.bucketName,
      key,
      expiry,
    );
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      await this.minioClient.statObject(this.bucketName, key);
      return true;
    } catch {
      return false;
    }
  }

  async listFiles(prefix: string): Promise<string[]> {
    const objects: string[] = [];
    const stream = this.minioClient.listObjects(this.bucketName, prefix, true);

    return new Promise((resolve, reject) => {
      stream.on('data', (obj: { name?: string }) => {
        if (obj.name) {
          objects.push(obj.name);
        }
      });
      stream.on('error', reject);
      stream.on('end', () => resolve(objects));
    });
  }

  getPublicUrl(key: string): string {
    return `${this.publicUrl}/${this.bucketName}/${key}`;
  }

  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot !== -1 ? filename.slice(lastDot) : '';
  }
}

