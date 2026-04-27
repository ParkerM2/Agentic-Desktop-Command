/**
 * Peer-domain constants shared across main and renderer.
 *
 * Keep this file free of runtime imports — it's intentionally tiny and pure
 * so the bundle picks it up without dragging extra modules in.
 */

/** PIN length used for the pairing handshake (initiator types receiver's PIN). */
export const PIN_LENGTH = 6;

/** Default character cap for displaying peer IDs / fingerprints in UI. */
export const PEER_ID_DISPLAY_MAX = 16;
