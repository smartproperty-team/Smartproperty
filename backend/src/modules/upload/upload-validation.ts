// ===========================================
// SmartProperty - Shared Upload Validation
// ===========================================
// The same mime-type and size checks were repeated inline across every
// upload route. Keep the allowed types and limits in one place so a change
// applies everywhere instead of drifting per endpoint.

import { BadRequestException } from '@nestjs/common';

/** Property and generic image uploads. */
export const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

/** Avatars deliberately exclude GIF. */
export const AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Reject a file whose mime type is not allowed or which exceeds the size
 * limit. Throws BadRequestException with the same messages the inline
 * checks used previously.
 */
export function assertValidUpload(
  file: Express.Multer.File,
  allowedTypes: readonly string[],
  maxBytes: number,
): void {
  if (!allowedTypes.includes(file.mimetype)) {
    throw new BadRequestException(
      `Invalid file type: ${file.mimetype}. Allowed: ${allowedTypes.join(', ')}`,
    );
  }

  if (file.size > maxBytes) {
    throw new BadRequestException(
      `File size exceeds ${Math.round(maxBytes / (1024 * 1024))}MB limit`,
    );
  }
}
