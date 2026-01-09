import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AppController } from './app.controller';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'MATH_KAFKA_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'math-gateway', // 카프카 클라이언트 식별자
            brokers: ['10.10.1.121:9092'], // 카프카 브로커 주소
          },
          consumer: {
            groupId: 'math-gateway-consumer', // 응답을 받기 위한 컨슈머 그룹
          },
          // 핵심: Producer 설정 추가
          producer: {
            allowAutoTopicCreation: true,  // 토픽 자동 생성. 운영은 false
            transactionTimeout: 30000,  // 트랜젝션 타임아웃 시간
            metadataMaxAge: 3000,  // 메타데이터를 캐싱하는 시간. 3초단위로 카프카 리더 체크

            idempotent: true,  // 멱등성 활성화. acks: all 필수.   브로커의 min.insync.replicas가 1로 되어 있다면: 1대만 저장해도 성공으로 간주되어 acks: all이어도 정상 작동
          },
          send: {
            acks: -1, // 1. acks 설정: 'all' (-1)은 모든 복제본 저장 확인, '1'은 리더만 확인. 
          },
          producerOnlyMode: false,  // 응답 받거나, 내부에 컨슈머 없으면 true. 메모리 아낌.
        },
      },
    ]),
  ],
  controllers: [AppController],
})
export class AppModule { }