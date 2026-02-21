# Voice feature: setup and end-to-end usage

## 1. Use the voice feature end-to-end

### 1.1 Create a voice profile

```bash
# Replace YOUR_JWT with a token from login (Settings or Login flow)
curl -X POST http://localhost:3001/api/voice-profiles \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My narrator",
    "provider": "elevenlabs",
    "providerVoiceId": "21m00Tcm4TlvDq8ikWAM",
    "language": "en"
  }'
```

- **provider:** `elevenlabs` or `azure`
- **providerVoiceId:** For ElevenLabs use a voice ID from their dashboard (e.g. default “Rachel” above). Optional for ElevenLabs (omit to clone from samples; upload then Train). For Azure or pre-made voices, set this (e.g. `en-US-JennyNeural`).

Save the returned `id` (e.g. `clxx...`) for the next steps.

### 1.2 Upload an audio sample

```bash
# Replace PROFILE_ID and YOUR_JWT
curl -X POST http://localhost:3001/api/voice-profiles/PROFILE_ID/assets \
  -H "Authorization: Bearer YOUR_JWT" \
  -F "file=@/path/to/your/sample.mp3" \
  -F "durationSec=30"
```

- **file:** multipart file (MP3 or WAV, max 25 MB).
- **durationSec:** optional.

### 1.3 Mark profile ready (train)

```bash
curl -X POST http://localhost:3001/api/voice-profiles/PROFILE_ID/train \
  -H "Authorization: Bearer YOUR_JWT"
```

### 1.4 Run a workflow with voice.tts

1. Set **S3** and optionally **TTS** env vars (see section 3).
2. In the app: create or open a workflow, add the **“My Voice (Clone) → Generate Voiceover”** node, set **Voice Profile ID** to the profile `id` from step 1.1 (or use the Voice profiles page and selector in the builder).
3. Connect text input (e.g. from **Generate Script**) and run the workflow.

Example workflow JSON: `documents/example-workflow-voice-tts.json`. Replace `<YOUR_VOICE_PROFILE_ID>` with your profile id.

---

## 2. Frontend: Voice profiles page and builder selector

- **Voice profiles page:** Dashboard user menu → **Voice profiles**. List, create, view, upload assets, and train.
- **Builder:** For the **voice.tts** node, the **Voice Profile** field is a dropdown of your profiles (no need to paste an ID).

---

## 3. Configure env for real runs

### S3 (required for voice.tts output and voice assets)

In `backend/.env`:

```env
S3_BUCKET=your-bucket-name
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
```

Optional:

- **S3_ENDPOINT** — for R2 or MinIO (e.g. `https://xxx.r2.cloudflarestorage.com`).
- **S3_PUBLIC_BASE_URL** — public base URL for generated links (e.g. `https://your-bucket.s3.region.amazonaws.com`).
- **S3_FORCE_PATH_STYLE=true** — for MinIO.

### TTS API keys

**Option A – In the app (Settings → API Keys):**  
Add **ElevenLabs** and/or **Azure** keys. They are stored encrypted and used for your user.

**Option B – Server env (fallback when user has no key):**

```env
# ElevenLabs
ELEVENLABS_API_KEY=your-elevenlabs-api-key

# Azure TTS
AZURE_TTS_SUBSCRIPTION_KEY=your-azure-speech-key
AZURE_TTS_REGION=eastus
```

### Queue (optional)

To run workflow execution via BullMQ instead of in-process:

```env
REDIS_URL=redis://localhost:6379
```

If `REDIS_URL` is not set, execution still runs in-process.

---

## Quick checklist

- [ ] Backend `.env`: at least `DATABASE_URL`, `JWT_SECRET`, `ENCRYPTION_SECRET`
- [ ] S3 vars set so voice output and assets can be stored
- [ ] TTS: API key in Settings or env (`ELEVENLABS_API_KEY` / `AZURE_TTS_SUBSCRIPTION_KEY`)
- [ ] Create a voice profile (API or Voice profiles page)
- [ ] Upload at least one asset and call train
- [ ] In a workflow, add voice.tts node and select that profile (or paste its ID)
- [ ] Run the workflow and check execution logs / output `audioUrl`
