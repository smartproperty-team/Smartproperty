// ===========================================
// SmartProperty - Display formatting
// ===========================================

const BYTE_UNITS = ["B", "KB", "MB", "GB"];

/** Human-readable file size: 0 B, 512 B, 1.5 KB, 2.3 MB, 1.1 GB. */
export const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const exponent = Math.min(
    Math.max(0, Math.floor(Math.log(bytes) / Math.log(1024))),
    BYTE_UNITS.length - 1,
  );
  const value = Number.parseFloat((bytes / 1024 ** exponent).toFixed(1));
  return `${value} ${BYTE_UNITS[exponent]}`;
};
