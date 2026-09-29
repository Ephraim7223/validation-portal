import { Logger } from '@nestjs/common';

const logger = new Logger('MailDispatcher');

/**
 * Fire-and-forget outbound mail so HTTP handlers return immediately
 * after the database write, instead of waiting on SMTP/OAuth.
 */
export function dispatchMail(
  label: string,
  send: () => Promise<unknown>,
): void {
  setImmediate(() => {
    send().catch((err) => {
      logger.error(
        `Background mail failed [${label}]: ${
          err instanceof Error ? err.message : err
        }`,
        err instanceof Error ? err.stack : undefined,
      );
    });
  });
}
