// ===========================================
// SmartProperty - Verification Service
// ===========================================

import {
  AdminVerificationItem,
  DocumentType,
  TenantVerification,
  UploadDocumentResponse,
  VerificationDocument,
  VerificationStatus,
} from '../types/verification';
import { api } from './api';

export const verificationService = {
  // Get tenant verification status
  getVerificationStatus: async (): Promise<TenantVerification> => {
    const response = await api.get<TenantVerification>('/verification/status');
    return response.data;
  },

  // Upload a verification document
  uploadDocument: async (
    file: File,
    type: DocumentType,
  ): Promise<UploadDocumentResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const response = await api.post<UploadDocumentResponse>(
      '/verification/upload',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      },
    );
    return response.data;
  },

  // Delete a uploaded document
  deleteDocument: async (documentId: string): Promise<void> => {
    await api.delete(`/verification/documents/${documentId}`);
  },

  // Submit documents for review
  submitForReview: async (): Promise<TenantVerification> => {
    const response = await api.post<TenantVerification>('/verification/submit');
    return response.data;
  },

  // Get all documents
  getDocuments: async (): Promise<VerificationDocument[]> => {
    const response = await api.get<VerificationDocument[]>(
      '/verification/documents',
    );
    return response.data;
  },

  // ─── Admin endpoints ─────────────────────────────────
  // Get all verifications (admin)
  getAllVerifications: async (
    status?: VerificationStatus,
  ): Promise<AdminVerificationItem[]> => {
    const params = status ? { status } : {};
    const response = await api.get<AdminVerificationItem[]>(
      '/verification/admin/all',
      { params },
    );
    return response.data;
  },

  // Approve verification (admin)
  approveVerification: async (
    verificationId: string,
  ): Promise<TenantVerification> => {
    const response = await api.post<TenantVerification>(
      `/verification/admin/${verificationId}/approve`,
    );
    return response.data;
  },

  // Reject verification (admin)
  rejectVerification: async (
    verificationId: string,
    reason: string,
  ): Promise<TenantVerification> => {
    const response = await api.post<TenantVerification>(
      `/verification/admin/${verificationId}/reject`,
      { reason },
    );
    return response.data;
  },
};
