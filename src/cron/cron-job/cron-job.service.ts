import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import axios from 'axios';

@Injectable()
export class CronJobService {
  private readonly logger = new Logger(CronJobService.name);

  @Cron('0 */10 * * * *')
  async handleCron() {
    try {
      const URL = 'https://portal-i49b.onrender.com/api/v1/auth/sign-in';

      const signInDto = {
        email: 'pdcvp@gmail.com',
        password: 'JUSTICE',
      };

      const response = await axios.post(URL, signInDto, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 200) {
        this.logger.log('Login successfull');
        // this.logger.log(response.data);
      } else {
        this.logger.error(`POST request failed with status ${response.status}`);
      }
    } catch (error) {
      this.logger.error('Error while sending request', error);
    }
  }
}
