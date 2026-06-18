import "reflect-metadata";

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module.js";

function loadEnvFile() {
  const searchRoots = [
    process.cwd(),
    dirname(new URL(import.meta.url).pathname),
  ];

  for (const root of searchRoots) {
    let current = root;
    for (let index = 0; index < 6; index += 1) {
      const envPath = join(current, ".env");
      if (existsSync(envPath)) {
        const content = readFileSync(envPath, "utf8");
        for (const rawLine of content.split("\n")) {
          const line = rawLine.trim();
          if (!line || line.startsWith("#")) {
            continue;
          }

          const separatorIndex = line.indexOf("=");
          if (separatorIndex === -1) {
            continue;
          }

          const key = line.slice(0, separatorIndex).trim();
          const value = line.slice(separatorIndex + 1).trim();
          if (!(key in process.env)) {
            process.env[key] = value;
          }
        }
        return;
      }

      const parent = join(current, "..");
      if (parent === current) {
        break;
      }
      current = parent;
    }
  }
}

loadEnvFile();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const allowedOrigins = [
    process.env.APP_URL ?? "http://localhost:3000",
    process.env.ADMIN_APP_URL ?? "http://localhost:3001",
  ];
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });
  await app.listen(Number(process.env.API_PORT ?? 4000));
}

void bootstrap();
