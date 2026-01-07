import { Controller } from '@nestjs/common';
import { MessagePattern, Payload, Ctx, KafkaContext } from '@nestjs/microservices';

@Controller()
export class AppController {
  @MessagePattern('math.sum') // 토픽명 'math.sum' 구독
  accumulate(@Payload() data: number[], @Ctx() context: KafkaContext): number {
    const originalMessage = context.getMessage(); // 카프카의 원본 메시지 전체 접근
    const partition = context.getPartition();    // 파티션 번호 확인

    console.log('원본 메시지:', originalMessage);
    console.log('파티션 번호:', partition);

    return data.reduce((a, b) => a + b, 0);
  }
}