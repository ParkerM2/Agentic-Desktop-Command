import { domain } from '../channel-builder';

export const MCP = domain('mcp', {
  CALL: ['tool'],
  LIST: ['connected'],
  GET: ['connection-state'],
});
