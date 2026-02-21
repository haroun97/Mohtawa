/**
 * S3-compatible object storage (AWS S3, Cloudflare R2, MinIO).
 * Uses env: S3_BUCKET, S3_REGION, S3_ENDPOINT (optional), S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const bucket = process.env.S3_BUCKET || "";
const region = process.env.S3_REGION || "auto";
const endpoint = process.env.S3_ENDPOINT || undefined;
const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === "true";

function getClient(): S3Client | null {
  if (!bucket) return null;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) return null;

  return new S3Client({
    region,
    endpoint: endpoint || undefined,
    forcePathStyle,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export interface UploadResult {
  key: string;
  url: string;
  bucket: string;
}

/**
 * Upload a buffer to S3. Returns public URL if bucket is public, or path-style key.
 * Prefix: voice-assets/ for training samples, voice-output/ for TTS output.
 */
export async function uploadToS3(
  key: string,
  body: Buffer,
  contentType: string,
  prefix = "voice-output",
): Promise<UploadResult> {
  const client = getClient();
  if (!client) {
    throw new Error(
      "S3 not configured. Set S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY (and optionally S3_REGION, S3_ENDPOINT).",
    );
  }

  const fullKey = `${prefix}/${key}`;
  const input: PutObjectCommandInput = {
    Bucket: bucket,
    Key: fullKey,
    Body: body,
    ContentType: contentType,
  };

  await client.send(new PutObjectCommand(input));

  const baseUrl = process.env.S3_PUBLIC_BASE_URL;
  const url = baseUrl
    ? `${baseUrl.replace(/\/$/, "")}/${fullKey}`
    : `s3://${bucket}/${fullKey}`;

  return { key: fullKey, url, bucket };
}

/**
 * Generate a unique key for a file (avoids collisions).
 */
export function generateStorageKey(
  userId: string,
  suffix: string,
  ext: string,
): string {
  const safe = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  return `${userId}/${safe}_${suffix}.${ext}`;
}

/** Prefix for EDL JSON and video assets (Phase 7). */
export const VIDEO_PREFIX = "video-assets";

/** Prefix for render preview frames (live export preview). */
export const RENDERS_PREFIX = "renders";

/**
 * Upload JSON (e.g. EDL) to S3. Returns full key and url.
 */
export async function uploadJsonToS3(
  key: string,
  data: unknown,
  prefix = VIDEO_PREFIX,
): Promise<UploadResult> {
  const body = Buffer.from(JSON.stringify(data), "utf-8");
  return uploadToS3(key, body, "application/json", prefix);
}

/**
 * Get object body as Buffer from S3 by key.
 */
export async function getObjectFromS3(fullKey: string): Promise<Buffer> {
  const client = getClient();
  if (!client) {
    throw new Error("S3 not configured. Cannot download asset.");
  }
  const response = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: fullKey }),
  );
  if (!response.Body) {
    throw new Error(`S3 object empty or not found: ${fullKey}`);
  }
  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * Generate a short-lived presigned GET URL for playback (e.g. audio in browser).
 * Key must be the full S3 key (e.g. voice-output/userId/xxx.mp3).
 */
export async function getPresignedPlayUrl(
  fullKey: string,
  expiresInSeconds = 900,
): Promise<string> {
  const client = getClient();
  if (!client) {
    throw new Error("S3 not configured. Cannot generate play URL.");
  }
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: fullKey,
  });
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

/**
 * Resolve stored asset URL to a buffer. Supports s3://bucket/key (GetObject) or https:// (fetch).
 */
export async function getBufferFromStoredUrl(url: string): Promise<Buffer> {
  if (url.startsWith("s3://")) {
    const match = url.match(/^s3:\/\/([^/]+)\/(.+)$/);
    if (!match || match[1] !== bucket) {
      throw new Error(`Invalid or unsupported S3 URL: ${url.slice(0, 50)}...`);
    }
    return getObjectFromS3(match[2]);
  }
  if (url.startsWith("http://") || url.startsWith("https://")) {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch asset (${res.status}): ${url.slice(0, 50)}...`);
    }
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
  throw new Error(`Unsupported asset URL scheme: ${url.slice(0, 50)}...`);
}
