# Voice: My Voice (Clone) → Generate Voiceover

This document describes the voice profile and `voice.tts` workflow node implementation.

## Secrets (API keys)

- **Choice:** Per-user API keys stored encrypted in the database (existing `ApiKey` model, AES-256-GCM via `ENCRYPTION_SECRET`), with **env-level fallback** for server-side keys.
- **Per user:** Users add keys in **Settings → API Keys** for `elevenlabs` and `azure`. Keys are encrypted at rest.
- **Env fallback:** If the user has no key, the server uses:
  - `ELEVENLABS_API_KEY` for ElevenLabs
  - `AZURE_TTS_SUBSCRIPTION_KEY` and `AZURE_TTS_REGION` for Azure TTS
- This allows a single shared key in production while still supporting per-user keys later.

## Data models

- **VoiceProfile:** `id`, `userId`, `provider` ('elevenlabs' | 'azure'), `providerVoiceId`, `name`, `language`, `trainingStatus`, timestamps.
- **VoiceTrainingAsset:** `id`, `userId`, `voiceProfileId`, `fileUrl` (S3), `durationSec`, `createdAt`.

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/voice-profiles` | Create voice profile (body: name, provider, providerVoiceId, language?) |
| GET | `/api/voice-profiles` | List current user's voice profiles |
| GET | `/api/voice-profiles/:id` | Get one profile with assets |
| POST | `/api/voice-profiles/:id/assets` | Upload audio sample (multipart `file`, optional `durationSec`) |
| POST | `/api/voice-profiles/:id/train` | Validate assets and mark profile ready |

All require `Authorization: Bearer <JWT>`.

## Workflow node: `voice.tts`

- **Type:** `voice.tts` (category: voice).
- **Inputs:** `text` (string from config or upstream).
- **Config:** `voiceProfileId`, `format` ('mp3' | 'wav'), `stability`, `similarityBoost`, `speakingRate` (optional).
- **Outputs:** `audioUrl` (S3 URL), `durationSec` (optional).
- **Runtime:** Resolves VoiceProfile → gets provider API key (user or env) → calls ElevenLabs or Azure TTS → uploads audio to S3 → returns URL. Logs never include raw API keys.

## Execution engine

- **BullMQ:** When `REDIS_URL` is set, `POST /api/workflows/:id/execute` enqueues a job; the worker runs the same execution logic. Without Redis, execution runs in-process.
- **Step logs:** Each step has `status` (idle | running | success | error), `startedAt`, `completedAt`, `durationMs`, `input`, `output`, `error`, `errorStack` (on failure).
- **Rerun from failed:** `POST /api/workflows/:id/rerun` with body `{ "executionId": "<failed-execution-id>" }` creates a new execution and re-runs from the first failed node (and downstream only), re-using prior step outputs.

## Where things plug in

- **Prisma:** `backend/prisma/schema.prisma` — `VoiceProfile`, `VoiceTrainingAsset`; migration applied.
- **Routes:** `backend/src/routes/voiceProfiles.ts` — mounted at `/api/voice-profiles` in `app.ts`.
- **Services:** `backend/src/services/voiceProfiles.ts`, `backend/src/services/apiKeys.ts` (getTTSApiKey).
- **TTS providers:** `backend/src/voice/providers/elevenlabs.ts`, `azure.ts`, `index.ts` (createProvider).
- **Node executor:** `backend/src/executors/voiceTts.ts`; wired in `backend/src/executors/index.ts` for `nodeType === "voice.tts"`.
- **Execution:** `backend/src/services/execution.ts` — passes `userId` and `getVoiceProfile` into context; `backend/src/lib/queue.ts` — BullMQ job shape; worker registered in `backend/src/index.ts`.
- **Frontend node:** `frontend/src/store/nodeDefinitions.ts` — definition for `voice.tts` ("My Voice (Clone) → Generate Voiceover").

## Example workflow

See `documents/example-workflow-voice-tts.json`. Replace `&lt;YOUR_VOICE_PROFILE_ID&gt;` with a profile ID from `POST/GET /api/voice-profiles`.

## Env vars (optional)

- Voice: `ELEVENLABS_API_KEY`, `AZURE_TTS_SUBSCRIPTION_KEY`, `AZURE_TTS_REGION`
- S3: `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION`, `S3_ENDPOINT`, `S3_PUBLIC_BASE_URL`
- Queue: `REDIS_URL`

See `backend/.env.example` for the full list.
