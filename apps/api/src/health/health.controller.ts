import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  // Database ping is added together with TypeORM in stage 1.
  @Get()
  check() {
    return { status: 'ok' };
  }
}
