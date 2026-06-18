import { createHash } from "node:crypto";

export type AttachmentInput = {
  fileName: string;
  mimeType: string;
  contentBase64: string;
};

export type CanonicalReportPayload = {
  title: string;
  description: string;
  poc: string;
  attachments: Array<{
    fileName: string;
    mimeType: string;
    sha256: string;
  }>;
};

export function sha256Hex(input: Buffer | string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function buildCanonicalReportPayload(
  title: string,
  description: string,
  poc: string,
  attachments: AttachmentInput[],
): CanonicalReportPayload {
  return {
    title: title.trim(),
    description: description.trim(),
    poc: poc.trim(),
    attachments: attachments
      .map((attachment) => ({
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        sha256: sha256Hex(Buffer.from(attachment.contentBase64, "base64")),
      }))
      .sort((left, right) => left.fileName.localeCompare(right.fileName)),
  };
}

export function serializeCanonicalReport(payload: CanonicalReportPayload): string {
  return JSON.stringify(payload);
}

export function buildReportHash(
  title: string,
  description: string,
  poc: string,
  attachments: AttachmentInput[],
): `0x${string}` {
  const payload = buildCanonicalReportPayload(title, description, poc, attachments);
  return `0x${sha256Hex(serializeCanonicalReport(payload))}`;
}
