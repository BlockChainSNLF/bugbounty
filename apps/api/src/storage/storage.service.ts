import { mkdir, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

import { Injectable } from "@nestjs/common";

import { sha256Hex } from "@bugbounty/shared";

@Injectable()
export class StorageService {
  private readonly root = process.env.UPLOAD_ROOT ?? "./apps/api/uploads";

  async persistAttachments(reportId: string, attachments: Array<{ fileName: string; mimeType: string; contentBase64: string }>) {
    const reportDir = join(this.root, reportId);
    await mkdir(reportDir, { recursive: true });

    return Promise.all(
      attachments.map(async (attachment) => {
        const buffer = Buffer.from(attachment.contentBase64, "base64");
        const safeName = basename(attachment.fileName).replace(/[^a-zA-Z0-9._-]/g, "_") || "file";
        const storagePath = join(reportDir, safeName);
        await writeFile(storagePath, buffer);
        return {
          fileName: safeName,
          mimeType: attachment.mimeType,
          sha256: sha256Hex(buffer),
          storagePath,
        };
      }),
    );
  }
}
