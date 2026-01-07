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
        },
      },
    ]),
  ],
  controllers: [AppController],
})
export class AppModule { }