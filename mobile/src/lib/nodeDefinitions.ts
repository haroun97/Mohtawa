/**
 * Minimal node definitions for the mobile canvas (type, category, title).
 * Full definitions and config forms are on the web Builder.
 */
export interface NodeDefinitionItem {
  type: string;
  category: string;
  title: string;
}

export const nodeDefinitions: NodeDefinitionItem[] = [
  { type: 'manual-trigger', category: 'trigger', title: 'Manual Trigger' },
  { type: 'schedule-trigger', category: 'trigger', title: 'Schedule' },
  { type: 'webhook-trigger', category: 'trigger', title: 'Webhook' },
  { type: 'generate-script', category: 'ai', title: 'Generate Script' },
  { type: 'text-summarizer', category: 'ai', title: 'Text Summarizer' },
  { type: 'prompter', category: 'ai', title: 'Prompter' },
  { type: 'text-to-speech', category: 'voice', title: 'Text to Speech' },
  { type: 'voice-clone', category: 'voice', title: 'Voice Clone' },
  { type: 'voice.tts', category: 'voice', title: 'My Voice (Clone) → Voiceover' },
  { type: 'render-video', category: 'video', title: 'Render Video' },
  { type: 'clip-joiner', category: 'video', title: 'Clip Joiner' },
  { type: 'video.auto_edit', category: 'video', title: 'Auto Edit (Draft)' },
  { type: 'video.render_final', category: 'video', title: 'Render Final' },
  { type: 'review.approval_gate', category: 'review', title: 'Review / Approve' },
  { type: 'youtube-publisher', category: 'social', title: 'YouTube Publisher' },
  { type: 'tiktok-publisher', category: 'social', title: 'TikTok Publisher' },
  { type: 'meta-publisher', category: 'social', title: 'Meta Publisher' },
  { type: 'ideas.source', category: 'ideas', title: 'Ideas Source' },
  { type: 'text.split_items', category: 'text', title: 'Split into Items' },
  { type: 'script.write', category: 'script', title: 'Write Script' },
  { type: 'flow.for_each', category: 'logic', title: 'For Each' },
  { type: 'if-else', category: 'logic', title: 'If/Else' },
  { type: 'loop', category: 'logic', title: 'Loop' },
  { type: 'delay', category: 'logic', title: 'Delay' },
  { type: 'merge', category: 'logic', title: 'Merge' },
  { type: 'set-variable', category: 'utility', title: 'Set Variable' },
  { type: 'http-request', category: 'utility', title: 'HTTP Request' },
  { type: 'notification', category: 'utility', title: 'Notification' },
  { type: 'logger', category: 'utility', title: 'Logger' },
  { type: 'preview-output', category: 'utility', title: 'Preview Output' },
  { type: 'preview.loop_outputs', category: 'utility', title: 'Preview Loop Outputs' },
];

export const categoryLabels: Record<string, string> = {
  trigger: 'Triggers',
  ai: 'AI',
  voice: 'Voice',
  video: 'Video',
  social: 'Social',
  logic: 'Logic',
  utility: 'Utilities',
  review: 'Review',
  ideas: 'Ideas',
  text: 'Text',
  script: 'Script',
};

export const categoryOrder = [
  'trigger',
  'ideas',
  'text',
  'script',
  'ai',
  'voice',
  'video',
  'review',
  'social',
  'logic',
  'utility',
];
