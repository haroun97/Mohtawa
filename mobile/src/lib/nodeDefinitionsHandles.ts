/**
 * Input/output handle IDs per node type for connection creation.
 * Must match backend/frontend expectations (single or multiple handles).
 */
export function getInputsOutputs(type: string): { inputs: string[]; outputs: string[] } {
  const entry = HANDLES[type];
  if (entry) return entry;
  return { inputs: ['input'], outputs: ['output'] };
}

const HANDLES: Record<string, { inputs: string[]; outputs: string[] }> = {
  'manual-trigger': { inputs: [], outputs: ['output'] },
  'schedule-trigger': { inputs: [], outputs: ['output'] },
  'webhook-trigger': { inputs: [], outputs: ['output'] },
  'generate-script': { inputs: ['input'], outputs: ['output'] },
  'text-summarizer': { inputs: ['input'], outputs: ['output'] },
  'prompter': { inputs: ['input'], outputs: ['output'] },
  'text-to-speech': { inputs: ['text'], outputs: ['audio'] },
  'voice-clone': { inputs: ['sample'], outputs: ['voice_id'] },
  'voice.tts': { inputs: ['text'], outputs: ['audio'] },
  'render-video': { inputs: ['audio', 'visuals'], outputs: ['video'] },
  'clip-joiner': { inputs: ['clips'], outputs: ['video'] },
  'video.auto_edit': { inputs: ['clips', 'voiceover', 'captions'], outputs: ['output'] },
  'video.render_final': { inputs: ['input'], outputs: ['output'] },
  'review.approval_gate': { inputs: ['input'], outputs: ['output'] },
  'youtube-publisher': { inputs: ['content'], outputs: ['result'] },
  'tiktok-publisher': { inputs: ['content'], outputs: ['result'] },
  'meta-publisher': { inputs: ['content'], outputs: ['result'] },
  'ideas.source': { inputs: [], outputs: ['items'] },
  'text.split_items': { inputs: ['input'], outputs: ['items'] },
  'script.write': { inputs: ['input'], outputs: ['output'] },
  'flow.for_each': { inputs: ['items'], outputs: ['output'] },
  'if-else': { inputs: ['input'], outputs: ['true', 'false'] },
  'loop': { inputs: ['items'], outputs: ['item', 'done'] },
  'delay': { inputs: ['input'], outputs: ['output'] },
  'merge': { inputs: ['input1', 'input2'], outputs: ['output'] },
  'set-variable': { inputs: ['input'], outputs: ['output'] },
  'http-request': { inputs: ['input'], outputs: ['response'] },
  'notification': { inputs: ['input'], outputs: ['output'] },
  'logger': { inputs: ['input'], outputs: ['output'] },
  'preview-output': { inputs: ['input'], outputs: ['output'] },
  'preview.loop_outputs': { inputs: ['input'], outputs: ['output'] },
};
