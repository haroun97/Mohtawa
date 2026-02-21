import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { uploadToS3, generateStorageKey, getBufferFromStoredUrl } from "../lib/storage";
import { getTTSApiKey } from "./apiKeys.js";
import { addVoice } from "./elevenlabsClone.js";
import type { VoiceProvider } from "../voice/types.js";

const VALID_PROVIDERS: VoiceProvider[] = ["elevenlabs", "azure"];

function assertProvider(p: string): asserts p is VoiceProvider {
  if (!VALID_PROVIDERS.includes(p as VoiceProvider)) {
    throw new AppError(
      400,
      `Invalid provider. Use: ${VALID_PROVIDERS.join(", ")}`,
    );
  }
}

const PENDING_CLONE_VOICE_ID = "";

export interface CreateVoiceProfileInput {
  name: string;
  provider: string;
  /** Required for Azure; optional for ElevenLabs (leave empty to clone from samples later). */
  providerVoiceId?: string;
  language?: string;
}

export async function createVoiceProfile(
  userId: string,
  data: CreateVoiceProfileInput,
) {
  assertProvider(data.provider);
  if (!data.name?.trim()) throw new AppError(400, "Name is required");
  const voiceId =
    data.provider === "elevenlabs"
      ? (data.providerVoiceId?.trim() || PENDING_CLONE_VOICE_ID)
      : (data.providerVoiceId?.trim() ?? "");
  if (data.provider !== "elevenlabs" && !voiceId) {
    throw new AppError(400, "providerVoiceId is required for Azure. For ElevenLabs you can leave it empty and clone from samples.");
  }

  const profile = await prisma.voiceProfile.create({
    data: {
      userId,
      name: data.name.trim(),
      provider: data.provider,
      providerVoiceId: voiceId || PENDING_CLONE_VOICE_ID,
      language: data.language?.trim() || "en",
      trainingStatus: "pending",
    },
  });

  return {
    id: profile.id,
    userId: profile.userId,
    provider: profile.provider,
    providerVoiceId: profile.providerVoiceId,
    name: profile.name,
    language: profile.language,
    trainingStatus: profile.trainingStatus,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}

export async function listVoiceProfiles(userId: string) {
  const list = await prisma.voiceProfile.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      assets: {
        select: { id: true, fileUrl: true, durationSec: true, createdAt: true },
      },
    },
  });

  return list.map((p) => ({
    id: p.id,
    userId: p.userId,
    provider: p.provider,
    providerVoiceId: p.providerVoiceId,
    name: p.name,
    language: p.language,
    trainingStatus: p.trainingStatus,
    assetCount: p.assets.length,
    assets: p.assets.map((a) => ({
      id: a.id,
      fileUrl: a.fileUrl,
      durationSec: a.durationSec,
      createdAt: a.createdAt.toISOString(),
    })),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));
}

export async function getVoiceProfile(profileId: string, userId: string) {
  const profile = await prisma.voiceProfile.findUnique({
    where: { id: profileId },
    include: { assets: true },
  });

  if (!profile) throw new AppError(404, "Voice profile not found");
  if (profile.userId !== userId) throw new AppError(403, "Access denied");

  return {
    id: profile.id,
    userId: profile.userId,
    provider: profile.provider,
    providerVoiceId: profile.providerVoiceId,
    name: profile.name,
    language: profile.language,
    trainingStatus: profile.trainingStatus,
    assets: profile.assets.map((a) => ({
      id: a.id,
      fileUrl: a.fileUrl,
      durationSec: a.durationSec,
      createdAt: a.createdAt.toISOString(),
    })),
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}

export async function getVoiceProfileForExecution(
  profileId: string,
  userId: string,
) {
  const profile = await prisma.voiceProfile.findUnique({
    where: { id: profileId },
  });

  if (!profile) return null;
  if (profile.userId !== userId) return null;

  return {
    id: profile.id,
    userId: profile.userId,
    provider: profile.provider as VoiceProvider,
    providerVoiceId: profile.providerVoiceId,
    name: profile.name,
    language: profile.language,
    trainingStatus: profile.trainingStatus,
  };
}

export interface UploadAssetInput {
  file: { buffer: Buffer; mimetype: string; originalname?: string };
  durationSec?: number;
}

export async function uploadVoiceAsset(
  profileId: string,
  userId: string,
  input: UploadAssetInput,
) {
  const profile = await prisma.voiceProfile.findUnique({
    where: { id: profileId },
  });

  if (!profile) throw new AppError(404, "Voice profile not found");
  if (profile.userId !== userId) throw new AppError(403, "Access denied");

  const ext =
    input.file.mimetype === "audio/wav"
      ? "wav"
      : input.file.mimetype === "audio/mpeg" || input.file.mimetype === "audio/mp3"
        ? "mp3"
        : "bin";
  const key = generateStorageKey(userId, "training", ext);

  const { url } = await uploadToS3(
    key,
    input.file.buffer,
    input.file.mimetype,
    "voice-assets",
  );

  const asset = await prisma.voiceTrainingAsset.create({
    data: {
      userId,
      voiceProfileId: profileId,
      fileUrl: url,
      durationSec: input.durationSec ?? null,
    },
  });

  return {
    id: asset.id,
    voiceProfileId: asset.voiceProfileId,
    fileUrl: asset.fileUrl,
    durationSec: asset.durationSec,
    createdAt: asset.createdAt.toISOString(),
  };
}

/**
 * Validate assets and mark profile ready. For ElevenLabs: call add-voice API to create a clone from samples and set providerVoiceId.
 */
export async function trainVoiceProfile(profileId: string, userId: string) {
  const profile = await prisma.voiceProfile.findUnique({
    where: { id: profileId },
    include: { assets: true },
  });

  if (!profile) throw new AppError(404, "Voice profile not found");
  if (profile.userId !== userId) throw new AppError(403, "Access denied");

  if (profile.assets.length === 0) {
    throw new AppError(
      400,
      "Add at least one audio sample before training.",
    );
  }

  if (profile.provider === "elevenlabs") {
    const keyConfig = await getTTSApiKey(userId, "elevenlabs");
    if (!keyConfig) {
      throw new AppError(
        400,
        "ElevenLabs API key required for cloning. Add it in Settings → API Keys or set ELEVENLABS_API_KEY.",
      );
    }
    const files: Array<{ buffer: Buffer; filename: string }> = [];
    for (const asset of profile.assets) {
      const buffer = await getBufferFromStoredUrl(asset.fileUrl);
      const ext = asset.fileUrl.includes(".wav") ? "wav" : "mp3";
      files.push({ buffer, filename: `sample_${asset.id}.${ext}` });
    }
    const result = await addVoice(keyConfig.apiKey, profile.name, files, {
      description: `Mohtawa voice profile ${profile.id}`,
      remove_background_noise: false,
    });
    await prisma.voiceProfile.update({
      where: { id: profileId },
      data: {
        providerVoiceId: result.voice_id,
        trainingStatus: "ready",
        updatedAt: new Date(),
      },
    });
    return {
      id: profile.id,
      trainingStatus: "ready",
      providerVoiceId: result.voice_id,
      message:
        "Voice cloned with ElevenLabs. Use this profile in the voice.tts node.",
    };
  }

  await prisma.voiceProfile.update({
    where: { id: profileId },
    data: { trainingStatus: "ready", updatedAt: new Date() },
  });

  return {
    id: profile.id,
    trainingStatus: "ready",
    message:
      "Profile validated and marked ready. Use voiceProfileId in voice.tts node.",
  };
}
