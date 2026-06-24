export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

export const MAX_ATTACHMENTS_PER_REPORT = 5;

export const ALLOWED_ATTACHMENT_MIME = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "text/plain",
] as const;

export type AllowedAttachmentMime = (typeof ALLOWED_ATTACHMENT_MIME)[number];

export function isAllowedAttachmentMime(mime: string): boolean {
  return (ALLOWED_ATTACHMENT_MIME as readonly string[]).includes(mime);
}

export function base64ByteLength(base64: string): number {
  const length = base64.length;
  if (length === 0) {
    return 0;
  }
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((length * 3) / 4) - padding;
}
