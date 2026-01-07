import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: ['10.10.1.121:9092'],
      },
      consumer: {
        groupId: 'math-service-consumer', // 실제 로직을 처리할 컨슈머 그룹
      },
    },
  });
  await app.listen();
  console.log('Math Kafka Service가 시작되었습니다.');
}
bootstrap();