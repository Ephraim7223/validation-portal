import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CronJobService } from './cron-job.service';

describe('CronJobService', () => {
  let service: CronJobService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CronJobService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              const map: Record<string, string | boolean> = {
                KEEP_ALIVE_ENABLED: false,
                KEEP_ALIVE_URL: 'http://localhost:7701/api/v1/health',
                API_BASE_URL: 'http://localhost:7701',
              };
              return map[key];
            },
          },
        },
      ],
    }).compile();

    service = module.get<CronJobService>(CronJobService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
