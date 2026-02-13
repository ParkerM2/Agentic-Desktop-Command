import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Validate a Slack v0 request signature.
 *
 * Slack signs requests as: v0=HMAC-SHA256("v0:{timestamp}:{body}", signingSecret)
 * See https://api.slack.com/authentication/verifying-requests-from-slack
 */
export function validateSlackSignature(
  signingSecret: string,
  timestamp: string,
  body: string,
  signature: string,
): boolean {
  const baseString = `v0:${timestamp}:${body}`;
  const computed = `v0=${createHmac('sha256', signingSecret).update(baseString).digest('hex')}`;

  if (computed.length !== signature.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
}

/**
 * Validate a GitHub HMAC-SHA256 webhook signature.
 *
 * GitHub sends the signature in the X-Hub-Signature-256 header as: sha256=<hex>
 * See https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries
 */
export function validateGitHubSignature(
  secret: string,
  body: string,
  signature: string,
): boolean {
  const computed = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;

  if (computed.length !== signature.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
}
