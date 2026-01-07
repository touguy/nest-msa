import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller()
export class AppController {
  @MessagePattern('math.sum') // 토픽명 'math.sum' 구독
  accumulate(@Payload() message: any): number {
    // 로그를 찍어 실제 구조를 확인해보세요. 
    // 보통 NestJS는 message.value에 데이터를 담습니다.
    console.log('실제 수신 데이터 전체:', message);
    // 카프카 메시지는 { value: ... } 형태로 들어옵니다.
    // 데이터 추출 (직접 접근 또는 구조 분해)
    const data = message.value ? message.value : message;
    console.log('카프카로부터 받은 데이터:', data);
    return (data || []).reduce((a, b) => a + b, 0);
  }
}