// ===========================================
// SmartProperty - AI Staging Service (Proxy)
// ===========================================

import {
  BadGatewayException,
  BadRequestException,
  GatewayTimeoutException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError, AxiosInstance } from 'axios';

export interface RequestStagingPayload {
  image_url: string;
  style: string;
  room_type?: string;
  strength?: number;
  property_id?: string;
}

export interface StagingJobResponse {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  message: string;
  stagedImagePath?: string | null;
  error?: string | null;
}

export interface StagingStyle {
  id: string;
  name: string;
  description: string;
  prompt: string;
}

@Injectable()
export class AiStagingService {
  private readonly logger = new Logger(AiStagingService.name);
  private readonly http: AxiosInstance;
  private readonly retries: number;

  constructor(private readonly config: ConfigService) {
    const baseURL =
      this.config.get<string>('app.aiService.url') || 'http://localhost:8000';
    const timeout = this.config.get<number>('app.aiService.timeoutMs') ?? 120000;
    this.retries = this.config.get<number>('app.aiService.retries') ?? 1;
    this.http = axios.create({
      baseURL,
      timeout,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async requestStaging(
    payload: RequestStagingPayload,
  ): Promise<StagingJobResponse> {
    const endpoint = '/api/v1/staging/stage';
    this.logger.log(
      `[ai-staging] Requesting staging: style=${payload.style} room=${payload.room_type ?? 'auto'}`,
    );

    let lastError: unknown;
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const response = await this.http.post<StagingJobResponse>(
          endpoint,
          payload,
        );
        this.logger.log(
          `[ai-staging] Job created: ${response.data.jobId} status=${response.data.status}`,
        );
        return response.data;
      } catch (error) {
        lastError = error;
        const mapped = this.mapAxiosError(error);
        if (mapped instanceof BadRequestException) {
          throw mapped;
        }
        if (attempt < this.retries) {
          this.logger.warn(
            `[ai-staging] attempt=${attempt} failed: ${(error as Error).message} - retrying`,
          );
          continue;
        }
        throw mapped;
      }
    }
    throw this.mapAxiosError(lastError);
  }

  async getJobStatus(jobId: string): Promise<StagingJobResponse> {
    try {
      const response = await this.http.get<StagingJobResponse>(
        `/api/v1/staging/jobs/${jobId}`,
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        `[ai-staging] Failed to fetch job status ${jobId}: ${(error as Error).message}`,
      );
      throw this.mapAxiosError(error);
    }
  }

  async getStagedImage(jobId: string) {
    try {
      const response = await this.http.get(
        `/api/v1/staging/result/${jobId}`,
        { responseType: 'stream' },
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        `[ai-staging] Failed to retrieve staged image ${jobId}: ${(error as Error).message}`,
      );
      throw this.mapAxiosError(error);
    }
  }

  async getStyles(): Promise<StagingStyle[]> {
    try {
      const response = await this.http.get<StagingStyle[]>(
        '/api/v1/staging/styles',
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        `[ai-staging] Failed to fetch styles: ${(error as Error).message}`,
      );
      throw this.mapAxiosError(error);
    }
  }

  private mapAxiosError(error: unknown): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ detail?: string }>;
      const status = axiosError.response?.status;
      const detail =
        axiosError.response?.data?.detail ||
        axiosError.message ||
        'AI staging request failed';

      if (axiosError.code === 'ECONNABORTED') {
        return new GatewayTimeoutException('AI staging request timed out');
      }
      if (!status) {
        return new BadGatewayException(
          `AI staging service unreachable: ${detail}`,
        );
      }
      if (status === 400 || status === 422) {
        return new BadRequestException(detail);
      }
      if (status === 503) {
        return new ServiceUnavailableException(detail);
      }
      if (status >= 500) {
        return new ServiceUnavailableException(detail);
      }
      return new BadGatewayException(detail);
    }
    return new ServiceUnavailableException(
      (error as Error)?.message || 'AI staging service error',
    );
  }
}
