/**
 * Settings — Voice sub-module
 *
 * Re-exports voice service and handler. Absorbed from features/voice/.
 */

export { createVoiceService } from '../voice/voice-service';
export { registerVoiceHandlers } from '../voice/voice-handlers';

export type { VoiceService } from '../voice/voice-service';
