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

/** A stored private file. It has no URL: links are signed per request. */
export type UploadedPrivateFile = Omit<UploadedFile, 'url'>;

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private minioClient: Client;
  private bucketName: string;
  private readonly privateBucketName: string;
  private publicUrl: string;
  private readonly publicUrlIncludesBucket: boolean;

  constructor(private readonly configService: ConfigService) {
    const endpoint =
      this.configService.get<string>('minio.endpoint') || 'localhost';
    const port = this.configService.get<number>('minio.port') || 9000;
    const useSSL = this.configService.get<boolean>('minio.useSSL') || false;
    const accessKey =
      this.configService.get<string>('minio.accessKey') || 'minioadmin';
    const secretKey =
      this.configService.get<string>('minio.secretKey') || 'minioadmin';

    this.bucketName =
      this.configService.get<string>('minio.bucketName') || 'smartproperty';
    this.privateBucketName =
      this.configService.get<string>('minio.privateBucketName') ||
      `${this.bucketName}-private`;
    this.publicUrlIncludesBucket =
      this.configService.get<boolean>('minio.publicUrlIncludesBucket') ?? true;
    this.publicUrl =
      this.configService.get<string>('minio.publicUrl') ||
      `http://${endpoint}:${port}`;

    const region = this.configService.get<string>('minio.region');

    this.minioClient = new Client({
      endPoint: endpoint,
      port: port,
      useSSL: useSSL,
      accessKey: accessKey,
      secretKey: secretKey,
      // Only pass region when configured; MinIO itself does not require one.
      ...(region ? { region } : {}),
    });

    this.logger.log(
      `MinIO client configured for ${endpoint}:${port}` +
        (region ? ` (region ${region})` : ''),
    );
  }

  async onModuleInit(): Promise<void> {
    await this.ensureBucketExists(this.bucketName, true);
    await this.ensureBucketExists(this.privateBucketName, false);
  }

  private async ensureBucketExists(
    bucket: string,
    publicRead: boolean,
  ): Promise<void> {
    try {
      const exists = await this.minioClient.bucketExists(bucket);
      if (!exists) {
        await this.minioClient.makeBucket(bucket);
        this.logger.log(`Bucket '${bucket}' created`);

        // New buckets are private; only the public one gets a read policy.
        if (!publicRead) return;
        const policy = {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { AWS: ['*'] },
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${bucket}/*`],
            },
          ],
        };
        await this.minioClient.setBucketPolicy(bucket, JSON.stringify(policy));
        this.logger.log(`Public read policy set for bucket '${bucket}'`);
      } else {
        this.logger.log(`Bucket '${bucket}' already exists`);
      }
    } catch (error) {
      this.logger.error(`Failed to ensure bucket '${bucket}' exists: ${error}`);
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    options: UploadOptions = {},
  ): Promise<UploadedFile> {
    const stored = await this.putFile(this.bucketName, file, options);

    // Build through getPublicUrl so the bucket-in-path rule lives in exactly
    // one place. This line used to duplicate it and silently ignored the
    // MINIO_PUBLIC_INCLUDE_BUCKET setting.
    return { ...stored, url: this.getPublicUrl(stored.key) };
  }

  /** Stores a file in the private bucket. Read it with getPrivateFileUrl. */
  async uploadPrivateFile(
    file: Express.Multer.File,
    options: UploadOptions = {},
  ): Promise<UploadedPrivateFile> {
    return this.putFile(this.privateBucketName, file, options);
  }

  private async putFile(
    bucket: string,
    file: Express.Multer.File,
    options: UploadOptions,
  ): Promise<UploadedPrivateFile> {
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
      bucket,
      key,
      file.buffer,
      file.size,
      metadata,
    );

    this.logger.log(`File uploaded: ${key}`);

    return {
      originalName: file.originalname,
      fileName,
      mimeType: file.mimetype,
      size: file.size,
      key,
    };
  }

  /** A link to a private file that stops working after a few minutes. */
  async getPrivateFileUrl(
    key: string,
    expirySeconds?: number,
  ): Promise<string> {
    const expiry =
      expirySeconds ||
      this.configService.get<number>('minio.privateUrlExpiry') ||
      600;
    return await this.minioClient.presignedGetObject(
      this.privateBucketName,
      key,
      expiry,
    );
  }

  async deletePrivateFile(key: string): Promise<void> {
    await this.minioClient.removeObject(this.privateBucketName, key);
    this.logger.log(`Private file deleted: ${key}`);
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
    return this.publicUrlIncludesBucket
      ? `${this.publicUrl}/${this.bucketName}/${key}`
      : `${this.publicUrl}/${key}`;
  }

  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot !== -1 ? filename.slice(lastDot) : '';
  }
}
