import { Controller, OnModuleDestroy } from '@nestjs/common';
import { MessagePattern, EventPattern, Payload, Ctx, KafkaContext } from '@nestjs/microservices';

@Controller()
export class AppController implements OnModuleDestroy {

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

    try {
      console.log(`[이벤트 수신] 오프셋 ${offset} 계산 시작:`, data);

      // 1. 비즈니스 로직 수행 (예: DB 저장 등)
      // 만약 여기서 에러가 나면 catch 블록으로 이동합니다.
      await this.doBusinessLogic(data);

      const result = data.reduce((a, b) => a + b, 0);
      console.log(`[이벤트 처리 완료] 결과: ${result} (이 결과는 DB에 저장되었다고 가정합니다)`);

      // 사실: NestJS Kafka의 기본 설정이 autoCommit: true라면 
      // 함수가 에러 없이 끝날 때 자동으로 오프셋이 커밋됩니다.

    } catch (error) {
      // 2. 롤백 및 에러 핸들링
      console.error(`[오류 발생] 오프셋 ${offset} 처리에 실패했습니다.`);

      // 핵심: 에러를 다시 던집니다(re-throw). 
      // 이렇게 하면 NestJS/KafkaJS는 메시지 처리에 실패한 것으로 간주하고 
      // 설정에 따라 재시도(Retry)를 하거나 커밋을 하지 않습니다.
      throw error;
    }
  }

  async doBusinessLogic(data: number[]) {
    // 2초 소요 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 예시: 데이터가 없으면 강제로 에러 발생 (롤백 테스트용)
    if (data.length === 0) {
      throw new Error('데이터가 비어 있어 처리가 불가능합니다.');
    }
  }
}