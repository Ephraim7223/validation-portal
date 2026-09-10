import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({
    summary: 'Health check',
    description:
      'Lightweight liveness probe used by keep-alive jobs and load balancers. Does not require authentication.',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    schema: {
      example: {
        statusCode: 200,
        message: 'OK',
        data: { status: 'ok', timestamp: '2026-01-01T00:00:00.000Z' },
        error: null,
      },
    },
  })
  check() {
    return {
      statusCode: 200,
      message: 'OK',
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
      },
      error: null,
    };
  }
}
