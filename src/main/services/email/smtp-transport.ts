/**
 * SMTP Transport — Nodemailer transport creation and email sending
 */

import nodemailer from 'nodemailer';

import type { Email, EmailSendResult } from '@shared/types';

import type { IpcRouter } from '@main/ipc/router';

import { isValidEmail, validateEmailAddresses } from './email-config';
import { getDecryptedPassword } from './email-encryption';

import type { StoredEmailConfig } from './email-store';

/**
 * Create a nodemailer transporter from the given config.
 */
export function createTransporter(config: StoredEmailConfig): nodemailer.Transporter | null {
  const password = getDecryptedPassword(config.pass);

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: password,
    },
  });
}

/**
 * Build nodemailer mail options from an Email and config.
 */
function buildMailOptions(email: Email, config: StoredEmailConfig): nodemailer.SendMailOptions {
  const mailOptions: nodemailer.SendMailOptions = {
    from: config.from,
    to: email.to.join(', '),
    subject: email.subject,
    text: email.body,
    ...(email.cc && email.cc.length > 0 ? { cc: email.cc.join(', ') } : {}),
    ...(email.bcc && email.bcc.length > 0 ? { bcc: email.bcc.join(', ') } : {}),
    ...(email.html ? { html: email.html } : {}),
    ...(email.replyTo ? { replyTo: email.replyTo } : {}),
  };

  if (email.attachments && email.attachments.length > 0) {
    mailOptions.attachments = email.attachments.map((att) => ({
      filename: att.filename,
      content: att.content,
      contentType: att.contentType,
      path: att.path,
    }));
  }

  return mailOptions;
}

/**
 * Validate the "from" address on an SmtpConfig update.
 */
export function validateFromAddress(from: string): void {
  if (!isValidEmail(from)) {
    throw new Error('Invalid "from" email address');
  }
}

/**
 * Send an email through the SMTP server.
 */
export async function sendEmailViaSmtp(
  email: Email,
  config: StoredEmailConfig,
  router: IpcRouter,
): Promise<EmailSendResult> {
  // Validate email addresses
  const allRecipients = [...email.to, ...(email.cc ?? []), ...(email.bcc ?? [])];
  const validation = validateEmailAddresses(allRecipients);

  if (!validation.valid) {
    return {
      success: false,
      error: `Invalid email addresses: ${validation.invalid.join(', ')}`,
    };
  }

  const transporter = createTransporter(config);
  if (!transporter) {
    return { success: false, error: 'Failed to create email transporter' };
  }

  try {
    const mailOptions = buildMailOptions(email, config);
    const info = (await transporter.sendMail(mailOptions)) as { messageId?: string };
    const messageId = typeof info.messageId === 'string' ? info.messageId : '';

    router.emit('event:email.sent', {
      messageId,
      to: email.to,
      subject: email.subject,
    });

    return { success: true, messageId: messageId.length > 0 ? messageId : undefined };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    router.emit('event:email.failed', {
      to: email.to,
      subject: email.subject,
      error: errorMessage,
    });

    return { success: false, error: errorMessage };
  }
}

/**
 * Verify SMTP connection using the transporter.
 */
export async function verifySmtpConnection(
  config: StoredEmailConfig,
): Promise<{ success: boolean; error?: string }> {
  const transporter = createTransporter(config);
  if (!transporter) {
    return { success: false, error: 'Failed to create email transporter' };
  }

  try {
    await transporter.verify();
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}
