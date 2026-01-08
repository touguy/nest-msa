import { Controller } from '@nestjs/common';
import { MessagePattern, EventPattern, Payload, Ctx, KafkaContext } from '@nestjs/microservices';

@Controller()
export class AppController {
  @MessagePattern('math.sum') // 토픽명 'math.sum' 구독
  accumulate(@Payload() data: number[], @Ctx() context: KafkaContext): number {
    const originalMessage = context.getMessage(); // 카프카의 원본 메시지 전체 접근
    const partition = context.getPartition();    // 파티션 번호 확인

    console.log('원본 메시지:', originalMessage);
    console.log('파티션 번호:', partition);

    return (data || []).reduce((a, b) => a + b, 0);
  }

  @EventPattern('math.sum.event') // 이벤트 패턴 사용
  async handleSumEvent(@Payload() data: number[]) {
    console.log('[이벤트 수신] 계산 시작:', data);

    // 복잡한 비즈니스 로직 시뮬레이션 (예: 2초 소요)
    await new Promise(resolve => setTimeout(resolve, 2000));

    const result = (data || []).reduce((a, b) => a + b, 0);

    console.log(`[이벤트 처리 완료] 결과: ${result} (이 결과는 DB에 저장되었다고 가정합니다)`);
  }
}