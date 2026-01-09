import { Controller, OnModuleDestroy, Inject } from '@nestjs/common';
import { MessagePattern, EventPattern, Payload, Ctx, KafkaContext, ClientKafka } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Controller()
export class AppController implements OnModuleDestroy {

  private readonly RETRY_DELAY_MS = 5000; // 재시도 전 대기 시간 (5초)
  private readonly MAX_RETRY_COUNT = 3;
  private readonly retryMap = new Map<string, number>(); // 메시지별 재시도 횟수 관리

  constructor(
    @Inject('MATH_KAFKA_SERVICE') private readonly client: ClientKafka, // DLQ 전송용
  ) { }

  // 2. 서버 종료 시 호출되는 메서드
  async onModuleDestroy() {
    console.log('[AppController] 서버 종료 신호를 감지했습니다. 진행 중인 요청을 마무리합니다.');
    // 마이크로서비스 서버(Consumer)는 main.ts의 enableShutdownHooks()에 의해 
    // 새로운 메시지 수신을 중단하고 기존 처리가 완료될 때까지 대기하게 됩니다.
  }

  @MessagePattern('math.sum') // 토픽명 'math.sum' 구독
  accumulate(@Payload() data: number[], @Ctx() context: KafkaContext): number {
    const originalMessage = context.getMessage(); // 카프카의 원본 메시지 전체 접근
    const partition = context.getPartition();    // 파티션 번호 확인

    console.log('원본 메시지:', originalMessage);
    console.log('파티션 번호:', partition);

    return (data || []).reduce((a, b) => a + b, 0);
  }

  @EventPattern('math.sum.event') // 이벤트 패턴 사용
  async handleSumEvent(@Payload() data: number[], @Ctx() context: KafkaContext) {
    console.log('[이벤트 수신] 계산 시작:', data);

    const { offset } = context.getMessage(); // 오프셋  
    const partition = context.getPartition(); // 파티션
    const topic = context.getTopic();   // 토픽

    const consumer = context.getConsumer();

    const messageKey = '${topic}-${partition}-${offset}';

    try {
      console.log('[이벤트 수신] 토픽:${topic}, 오프셋 ${offset} 계산 시작:', data);

      // 1. 비즈니스 로직 수행 (예: DB 저장 등)
      // 만약 여기서 에러가 나면 catch 블록으로 이동합니다.
      await this.doBusinessLogic(data);

      const result = data.reduce((a, b) => a + b, 0);
      console.log('[이벤트 처리 완료] 결과: ${result} (이 결과는 DB에 저장되었다고 가정합니다)');

      this.retryMap.delete(messageKey);
      console.log('[성공] 오프셋 ${offset} 커밋 완료');

      // NestJS Kafka의 기본 설정이 autoCommit: true라면 함수가 에러 없이 끝날 때 자동으로 오프셋이 커밋됩니다.
    } catch (error) {
      const currentRetry = (this.retryMap.get(messageKey) || 0) + 1;
      console.error('[에러] 오프셋 ${offset} 실패 (${currentRetry}회): ${error.message}');

      if (currentRetry <= this.MAX_RETRY_COUNT) {

        // 2. 재시도 로직: 카운트 증가 후 에러를 던져 커밋 방지
        this.retryMap.set(messageKey, currentRetry);

        console.log('[일시정지] ${partition}번 파티션 ${this.RETRY_DELAY}ms 동안 중지');

        // 해당 파티션을 멈춰서 다음 메시지를 읽지 못하게 함 (순서 보장 효과)
        consumer.pause([{ topic, partitions: [partition] }]);

        setTimeout(() => {
          console.log(`[재개] ${partition}번 파티션 재시작 및 재시도 진행`);
          // 5초 뒤 파티션 재개 -> 카프카가 커밋 안 된 이 메시지를 다시 가져옴
          consumer.resume([{ topic, partitions: [partition] }]);
        }, this.RETRY_DELAY_MS);

        // 5초 후 재시도하도록 약간의 지연을 주고 싶다면 여기서 조절 가능 (의견 참고)
        throw error; // 에러를 던지면 NestJS가 커밋하지 않고 메시지를 다시 가져옵니다.

      } else {
        // 5. 최종 실패 시 DLQ 전송 및 강제 커밋 (순서를 위해 포기하고 다음으로 넘어감)
        // 3. DLQ 도입: 특정 조건이나 재시도 실패 시 DLQ로 전송
        // 실무에서는 전송 전 재시도 횟수를 체크하는 로직을 추가하는 것이 좋습니다.
        console.log('[최종 실패] ${this.MAX_RETRY_COUNT}회 초과. DLQ로 이동.');

        const dlqTopic = '${topic}.dlq';
        await firstValueFrom(
          this.client.emit(dlqTopic, {
            originalValue: data,
            error: error.message,
            originalOffset: offset,
            timestamp: new Date().toISOString(),
          })
        );

        this.retryMap.delete(messageKey);
        console.log('[DLQ] 실패 메시지 ${dlqTopic}로 이동 및 커밋 완료');
        return;
      }
    }
  }

  async doBusinessLogic(data: number[]) {
    // 2초 소요 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 예시: 데이터가 없으면 강제로 에러 발생 (롤백 테스트용)
    if (!data || data.length === 0) {
      throw new Error('데이터가 비어 있어 처리가 불가능합니다.');
    }
  }
}