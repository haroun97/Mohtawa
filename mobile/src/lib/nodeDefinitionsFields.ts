/**
 * Field definitions per node type for the mobile builder config form.
 * Aligns with web nodeDefinitions where possible.
 */
export interface FieldDef {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number' | 'toggle';
  options?: string[];
  defaultValue?: string | number | boolean;
  placeholder?: string;
  required?: boolean;
  help?: string;
}

/** Special field names we treat as pickers (voice profile, idea doc). */
export const VOICE_PROFILE_FIELD = 'voiceProfileId';
export const IDEA_DOC_FIELD = 'ideaDocId';

const FIELDS: Record<string, FieldDef[]> = {
  'manual-trigger': [],
  'schedule-trigger': [
    { name: 'cron', label: 'Cron', type: 'text', placeholder: '0 9 * * *' },
    { name: 'timezone', label: 'Timezone', type: 'select', options: ['UTC', 'US/Eastern', 'US/Pacific', 'Europe/London'], defaultValue: 'UTC' },
  ],
  'webhook-trigger': [
    { name: 'method', label: 'Method', type: 'select', options: ['POST', 'GET', 'PUT'], defaultValue: 'POST' },
    { name: 'path', label: 'Path', type: 'text', placeholder: '/my-webhook' },
  ],
  'generate-script': [
    { name: 'provider', label: 'Provider', type: 'select', options: ['openai', 'anthropic'], defaultValue: 'openai' },
    { name: 'model', label: 'Model', type: 'select', options: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'claude-sonnet-4-20250514', 'claude-3-haiku-20240307'], defaultValue: 'gpt-4o' },
    { name: 'prompt', label: 'Prompt', type: 'textarea', placeholder: 'Write a script about...', required: true },
    { name: 'temperature', label: 'Temperature', type: 'number', defaultValue: 0.7 },
  ],
  'text-summarizer': [
    { name: 'provider', label: 'Provider', type: 'select', options: ['openai', 'anthropic'], defaultValue: 'openai' },
    { name: 'model', label: 'Model', type: 'select', options: ['gpt-4o-mini', 'gpt-4o'], defaultValue: 'gpt-4o-mini' },
    { name: 'style', label: 'Style', type: 'select', options: ['Concise', 'Detailed', 'Bullet Points'], defaultValue: 'Concise' },
  ],
  'prompter': [
    { name: 'provider', label: 'Provider', type: 'select', options: ['openai', 'anthropic'], defaultValue: 'openai' },
    { name: 'model', label: 'Model', type: 'select', options: ['gpt-4o', 'gpt-4o-mini'], defaultValue: 'gpt-4o' },
    { name: 'prompt', label: 'Prompt template', type: 'textarea', placeholder: 'Given: {{input}}...', required: true },
  ],
  'text-to-speech': [
    { name: 'provider', label: 'Provider', type: 'select', options: ['openai', 'elevenlabs'], defaultValue: 'openai' },
    { name: 'voice', label: 'Voice', type: 'select', options: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'], defaultValue: 'nova' },
    { name: 'text', label: 'Text', type: 'textarea', placeholder: 'Leave empty to use upstream' },
  ],
  'voice-clone': [
    { name: 'name', label: 'Voice name', type: 'text', placeholder: 'My Voice', required: true },
    { name: 'description', label: 'Description', type: 'text', placeholder: 'Optional' },
  ],
  'voice.tts': [
    { name: VOICE_PROFILE_FIELD, label: 'Voice profile', type: 'text', placeholder: 'Select below', required: true },
    { name: 'format', label: 'Format', type: 'select', options: ['mp3', 'wav'], defaultValue: 'mp3' },
    { name: 'text', label: 'Text', type: 'textarea', placeholder: 'Leave empty to use upstream' },
    { name: 'stability', label: 'Stability (0–1)', type: 'number', defaultValue: 0.5 },
    { name: 'similarityBoost', label: 'Similarity (0–1)', type: 'number', defaultValue: 0.75 },
  ],
  'render-video': [
    { name: 'template', label: 'Template', type: 'select', options: ['Default', 'News Overlay', 'Podcast Wave', 'Slideshow', 'Subtitled'], defaultValue: 'Default' },
    { name: 'resolution', label: 'Resolution', type: 'select', options: ['1080p', '720p', '4K', '9:16 Portrait'], defaultValue: '1080p' },
  ],
  'clip-joiner': [
    { name: 'transition', label: 'Transition', type: 'select', options: ['None', 'Crossfade', 'Wipe', 'Slide'], defaultValue: 'Crossfade' },
    { name: 'transitionDuration', label: 'Duration (s)', type: 'number', defaultValue: 0.5 },
  ],
  'video.auto_edit': [
    { name: 'aspectRatio', label: 'Aspect ratio', type: 'select', options: ['9:16', '1:1', '16:9'], defaultValue: '9:16' },
    { name: 'stylePreset', label: 'Style', type: 'select', options: ['documentary', 'energetic', 'calm'], defaultValue: 'documentary' },
    { name: 'minClipSec', label: 'Min clip (s)', type: 'number', defaultValue: 1.5 },
    { name: 'maxClipSec', label: 'Max clip (s)', type: 'number', defaultValue: 3.5 },
    { name: 'enableMusic', label: 'Enable music', type: 'toggle', defaultValue: false },
  ],
  'video.render_final': [],
  'review.approval_gate': [
    { name: 'mode', label: 'Mode', type: 'select', options: ['auto_approve', 'manual_review', 'manual_with_timeout'], defaultValue: 'manual_review' },
    { name: 'autoApproveAfterSec', label: 'Auto-approve after (s)', type: 'number', placeholder: '3600' },
  ],
  'youtube-publisher': [
    { name: 'title', label: 'Video title', type: 'text', placeholder: 'Title', required: true },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'visibility', label: 'Visibility', type: 'select', options: ['Public', 'Unlisted', 'Private'], defaultValue: 'Public' },
  ],
  'tiktok-publisher': [
    { name: 'caption', label: 'Caption', type: 'textarea', required: true },
    { name: 'privacy', label: 'Privacy', type: 'select', options: ['Public', 'Friends', 'Private'], defaultValue: 'Public' },
  ],
  'meta-publisher': [
    { name: 'platform', label: 'Platform', type: 'select', options: ['Instagram', 'Facebook', 'Both'], defaultValue: 'Instagram' },
    { name: 'caption', label: 'Caption', type: 'textarea', required: true },
  ],
  'ideas.source': [
    { name: 'provider', label: 'Provider', type: 'select', options: ['manual', 'csv', 'in_app_editor', 'notion', 'google_docs'], defaultValue: 'manual' },
    { name: 'manualItems', label: 'Ideas (one per line or JSON)', type: 'textarea', placeholder: 'Idea one\nIdea two' },
    { name: 'inAppEditorDocMode', label: 'Doc mode', type: 'select', options: ['single', 'multi'], defaultValue: 'single' },
    { name: IDEA_DOC_FIELD, label: 'Document', type: 'text', placeholder: 'Select below' },
  ],
  'text.split_items': [
    { name: 'splitMode', label: 'Split by', type: 'select', options: ['headings', 'bullets', 'separator'], defaultValue: 'headings' },
    { name: 'separator', label: 'Separator', type: 'text', placeholder: '---' },
  ],
  'script.write': [
    { name: 'mode', label: 'Mode', type: 'select', options: ['pass_through', 'manual'], defaultValue: 'pass_through' },
    { name: 'scriptOverride', label: 'Script override', type: 'textarea', placeholder: 'Optional' },
  ],
  'flow.for_each': [
    { name: 'mode', label: 'Execution', type: 'select', options: ['sequential', 'parallel'], defaultValue: 'sequential' },
  ],
  'if-else': [
    { name: 'conditionType', label: 'Condition type', type: 'select', options: ['expression', 'field_check'], defaultValue: 'field_check' },
    { name: 'field', label: 'Field name', type: 'text', placeholder: 'statusCode' },
    { name: 'operator', label: 'Operator', type: 'select', options: ['equals', 'not_equals', 'contains', 'greater_than', 'less_than'], defaultValue: 'equals' },
    { name: 'compareValue', label: 'Value', type: 'text', placeholder: '200' },
  ],
  'delay': [
    { name: 'duration', label: 'Duration (s)', type: 'number', defaultValue: 5 },
  ],
  'merge': [
    { name: 'strategy', label: 'Strategy', type: 'select', options: ['Wait All', 'First Wins', 'Append'], defaultValue: 'Wait All' },
  ],
  'set-variable': [
    { name: 'variableName', label: 'Variable name', type: 'text', required: true },
    { name: 'value', label: 'Value', type: 'textarea', placeholder: '{{input.data}}' },
  ],
  'http-request': [
    { name: 'method', label: 'Method', type: 'select', options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], defaultValue: 'GET' },
    { name: 'url', label: 'URL', type: 'text', placeholder: 'https://...', required: true },
  ],
  'notification': [
    { name: 'channel', label: 'Channel', type: 'select', options: ['Email', 'Slack', 'Discord', 'In-App'], defaultValue: 'Email' },
    { name: 'message', label: 'Message', type: 'textarea', required: true },
  ],
  'logger': [
    { name: 'label', label: 'Log label', type: 'text', placeholder: 'debug-step' },
    { name: 'logLevel', label: 'Level', type: 'select', options: ['info', 'warn', 'error', 'debug'], defaultValue: 'info' },
  ],
  'preview-output': [],
  'preview.loop_outputs': [],
  'loop': [
    { name: 'maxIterations', label: 'Max iterations', type: 'number', defaultValue: 100 },
  ],
};

export function getFieldsForType(type: string): FieldDef[] {
  return FIELDS[type] ?? [];
}
