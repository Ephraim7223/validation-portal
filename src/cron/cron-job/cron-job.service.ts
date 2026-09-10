import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import axios from 'axios';

@Injectable()
export class CronJobService {
  private readonly logger = new Logger(CronJobService.name);

  constructor(private readonly configService: ConfigService) {}

  @Cron('0 */10 * * * *')
  async handleCron() {
    const enabled = this.configService.get<string | boolean>(
      'KEEP_ALIVE_ENABLED',
    );
    if (enabled === false || enabled === 'false') {
      return;
    }

    const url =
      this.configService.get<string>('KEEP_ALIVE_URL') ||
      `${this.configService.get('API_BASE_URL') || 'http://localhost:7700'}/api/v1/health`;

    try {
      const response = await axios.get(url, {
        timeout: 15000,
        headers: { Accept: 'application/json' },
        validateStatus: () => true,
      });

      if (response.status >= 200 && response.status < 300) {
        this.logger.log(`Keep-alive OK (${response.status}) → ${url}`);
      } else {
        this.logger.warn(
          `Keep-alive non-success status ${response.status} → ${url}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Keep-alive request failed → ${url}`,
        error instanceof Error ? error.message : undefined,
      );
    }
  }
}
