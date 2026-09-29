import { Logger } from '@nestjs/common';

const logger = new Logger('MailDispatcher');

/**
 * Start outbound mail without blocking the HTTP response.
 * Starts the promise immediately (not deferred) so work begins
 * before the response is fully flushed on hosts like Render.
 */
export function dispatchMail(
  label: string,
  send: () => Promise<unknown>,
): void {
  void send()
    .then(() => {
      logger.log(`Background mail sent [${label}]`);
    })
    .catch((err) => {
      logger.error(
        `Background mail failed [${label}]: ${
          err instanceof Error ? err.message : err
        }`,
        err instanceof Error ? err.stack : undefined,
      );
    });
}
