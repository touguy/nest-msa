import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller()
export class AppController {
  @MessagePattern({ cmd: 'add' })
  accumulate(@Payload() data: number[]): number {
    console.log('데이터 수신:', data);
    return (data || []).reduce((a, b) => a + b, 0);
  }
}