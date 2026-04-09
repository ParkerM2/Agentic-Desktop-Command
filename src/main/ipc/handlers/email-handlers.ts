/**
 * Email IPC handlers
 */

import { EMAIL } from '@shared/ipc/email/channels';

import { createThrottle } from '../throttle';

import type { EmailService } from '../../services/email/email-service';
import type { IpcRouter } from '../router';

export function registerEmailHandlers(router: IpcRouter, service: EmailService): void {
  const allowSend = createThrottle(2000);

  router.handle(EMAIL.SEND.MESSAGE, (email) => {
    if (!allowSend()) {
      throw new Error('Too many requests. Please wait.');
    }
    return service.sendEmail(email);
  });

  router.handle(EMAIL.GET.CONFIG, () => Promise.resolve(service.getConfig()));

  router.handle(EMAIL.UPDATE.CONFIG, (config) => {
    service.updateConfig(config);
    return Promise.resolve({ success: true });
  });

  router.handle(EMAIL.TEST.CONNECTION, () => service.testConnection());

  router.handle(EMAIL.GET.QUEUE, () => Promise.resolve(service.getQueuedEmails()));

  router.handle(EMAIL.RETRY.QUEUED, ({ emailId }) => service.retryQueuedEmail(emailId));

  router.handle(EMAIL.REMOVE.QUEUED, ({ emailId }) => {
    service.removeFromQueue(emailId);
    return Promise.resolve({ success: true });
  });
}
