import { prisma } from "../lib/prisma";
import { encrypt, decrypt, maskKey } from "../lib/crypto";
import { AppError } from "../middleware/errorHandler";

// Cast so TS sees apiKey delegate (generated client); run `npx prisma generate` if missing
type PrismaApiKeyDelegate = {
  findMany: (args?: object) => Promise<Array<{ id: string; userId: string; service: string; encryptedKey: string; label: string | null; createdAt: Date; updatedAt: Date }>>;
  findFirst: (args?: object) => Promise<{ id: string; userId: string; service: string; encryptedKey: string; label: string | null; createdAt: Date; updatedAt: Date } | null>;
  create: (args: object) => Promise<{ id: string; userId: string; service: string; encryptedKey: string; label: string | null; createdAt: Date; updatedAt: Date }>;
  update: (args: object) => Promise<{ id: string; userId: string; service: string; encryptedKey: string; label: string | null; createdAt: Date; updatedAt: Date }>;
  delete: (args: object) => Promise<{ id: string; userId: string; service: string; encryptedKey: string; label: string | null; createdAt: Date; updatedAt: Date }>;
  findUnique: (args: object) => Promise<{ id: string; userId: string; service: string; encryptedKey: string; label: string | null; createdAt: Date; updatedAt: Date } | null>;
};
const db = prisma as unknown as { apiKey: PrismaApiKeyDelegate };

const VALID_SERVICES = [
  "openai",
  "anthropic",
  "elevenlabs",
  "azure",
  "google-tts",
  "meta",
  "tiktok",
  "youtube",
] as const;

export type ServiceName = (typeof VALID_SERVICES)[number];

export function isValidService(s: string): s is ServiceName {
  return VALID_SERVICES.includes(s as ServiceName);
}

export async function listApiKeys(userId: string) {
  const keys = await db.apiKey.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return keys.map((k) => ({
    id: k.id,
    service: k.service,
    label: k.label,
    maskedKey: maskKey(decrypt(k.encryptedKey)),
    createdAt: k.createdAt.toISOString(),
    updatedAt: k.updatedAt.toISOString(),
  }));
}

export async function createApiKey(
  userId: string,
  data: { service: string; key: string; label?: string },
) {
  if (!isValidService(data.service)) {
    throw new AppError(400, `Invalid service. Valid services: ${VALID_SERVICES.join(", ")}`);
  }

  if (!data.key || data.key.trim().length < 10) {
    throw new AppError(400, "API key must be at least 10 characters");
  }

  const existing = await db.apiKey.findFirst({
    where: { userId, service: data.service },
  });

  if (existing) {
    const updated = await db.apiKey.update({
      where: { id: existing.id },
      data: {
        encryptedKey: encrypt(data.key.trim()),
        label: data.label || existing.label,
      },
    });
    return {
      id: updated.id,
      service: updated.service,
      label: updated.label,
      maskedKey: maskKey(data.key.trim()),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  const apiKey = await db.apiKey.create({
    data: {
      userId,
      service: data.service,
      encryptedKey: encrypt(data.key.trim()),
      label: data.label || null,
    },
  });

  return {
    id: apiKey.id,
    service: apiKey.service,
    label: apiKey.label,
    maskedKey: maskKey(data.key.trim()),
    createdAt: apiKey.createdAt.toISOString(),
    updatedAt: apiKey.updatedAt.toISOString(),
  };
}

export async function deleteApiKey(keyId: string, userId: string) {
  const key = await db.apiKey.findUnique({ where: { id: keyId } });
  if (!key) throw new AppError(404, "API key not found");
  if (key.userId !== userId) throw new AppError(403, "Access denied");
  await db.apiKey.delete({ where: { id: keyId } });
}

export async function getDecryptedKey(
  userId: string,
  service: string,
): Promise<string | null> {
  const key = await db.apiKey.findFirst({
    where: { userId, service },
  });
  if (!key) return null;
  return decrypt(key.encryptedKey);
}

/**
 * Resolve TTS provider API key: per-user (encrypted in DB) first, then env-level fallback.
 * Env vars: ELEVENLABS_API_KEY, AZURE_TTS_SUBSCRIPTION_KEY (and AZURE_TTS_REGION for Azure).
 * Never log the returned value.
 */
export async function getTTSApiKey(
  userId: string,
  provider: "elevenlabs" | "azure",
): Promise<{ apiKey: string; region?: string } | null> {
  const userKey = await getDecryptedKey(userId, provider);
  if (userKey && userKey.trim().length >= 10) {
    return { apiKey: userKey.trim(), region: provider === "azure" ? process.env.AZURE_TTS_REGION ?? undefined : undefined };
  }
  if (provider === "elevenlabs" && process.env.ELEVENLABS_API_KEY) {
    return { apiKey: process.env.ELEVENLABS_API_KEY };
  }
  if (provider === "azure" && process.env.AZURE_TTS_SUBSCRIPTION_KEY) {
    return {
      apiKey: process.env.AZURE_TTS_SUBSCRIPTION_KEY,
      region: process.env.AZURE_TTS_REGION || "eastus",
    };
  }
  return null;
}
