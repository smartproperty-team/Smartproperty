// ===========================================
// SmartProperty - Fraud Detection Proxy Service
// ===========================================

import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError, AxiosInstance } from 'axios';
import {
  DocumentType,
  FraudAnalysisResult,
  RiskLevel,
} from './entities/verification.entity';

interface AnalyzeDocumentResponse {
  fraud_score: number;
  risk_level: 'low' | 'medium' | 'high';
  flags: string[];
  ocr_text?: string | null;
  ocr_fields?: Record<string, unknown>;
  llm_findings?: string[];
  analyzed_at: string;
}

export interface AnalyzeUserProfile {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

@Injectable()
export class FraudDetectionService {
  private readonly logger = new Logger(FraudDetectionService.name);
  private readonly http: AxiosInstance;

  constructor(private readonly config: ConfigService) {
    const baseURL =
      this.config.get<string>('app.aiService.url') || 'http://localhost:8000';
    const timeout =
      this.config.get<number>('app.aiService.timeoutMs') ?? 60000;
    this.http = axios.create({
      baseURL,
      timeout,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async analyzeDocument(input: {
    fileUrl: string;
    documentType: DocumentType;
    userProfile?: AnalyzeUserProfile;
  }): Promise<FraudAnalysisResult> {
    const endpoint = '/api/v1/verification/analyze';
    const startedAt = Date.now();
    this.logger.log(
      `[fraud] -> ${endpoint} type=${input.documentType} url=${input.fileUrl.slice(0, 80)}`,
    );

    try {
      const response = await this.http.post<AnalyzeDocumentResponse>(endpoint, {
        file_url: input.fileUrl,
        document_type: input.documentType,
        user_profile: input.userProfile ?? null,
      });
      const elapsed = Date.now() - startedAt;
      this.logger.log(
        `[fraud] ok score=${response.data.fraud_score} risk=${response.data.risk_level} elapsedMs=${elapsed}`,
      );
      return {
        fraudScore: response.data.fraud_score,
        riskLevel: response.data.risk_level as RiskLevel,
        flags: response.data.flags ?? [],
        ocrText: response.data.ocr_text ?? undefined,
        ocrFields:
          (response.data.ocr_fields as Record<
            string,
            string | number | undefined
          >) ?? {},
        llmFindings: response.data.llm_findings ?? [],
        analyzedAt: new Date(response.data.analyzed_at),
      };
    } catch (error) {
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
        'Fraud analysis failed';

      if (axiosError.code === 'ECONNABORTED') {
        return new GatewayTimeoutException('Fraud analysis timed out');
      }
      if (!status) {
        return new BadGatewayException(`AI service unreachable: ${detail}`);
      }
      if (status >= 500) {
        return new ServiceUnavailableException(detail);
      }
      return new BadGatewayException(detail);
    }
    return new ServiceUnavailableException(
      (error as Error)?.message || 'Fraud analysis error',
    );
  }
}
