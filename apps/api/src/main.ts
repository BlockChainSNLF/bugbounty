import "reflect-metadata";

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { NestFactory } from "@nestjs/core";
import { json, urlencoded } from "express";

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
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(json({ limit: "40mb" }));
  app.use(urlencoded({ extended: true, limit: "40mb" }));
  app.use((req: { method: string; url: string }, _res: unknown, next: () => void) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
  });
  const allowedOrigins = [
    process.env.APP_URL ?? "http://localhost:3030",
    process.env.ADMIN_APP_URL ?? "http://localhost:3001",
  ];
  console.log("CORS allowed origins:", allowedOrigins);
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, origin?: string | boolean) => void) => {
      if (!origin) {
        callback(null, true);
      } else if (allowedOrigins.includes(origin)) {
        callback(null, origin);
      } else {
        console.warn(`CORS rejected origin: ${origin} (allowed: ${allowedOrigins.join(", ")})`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  });
  await app.listen(Number(process.env.API_PORT ?? 4000));
}

void bootstrap();
