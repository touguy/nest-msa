import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 핵심: Shutdown Hooks 활성화: 이 설정을 해야 서버 종료 시 onModuleDestroy, beforeApplicationShutdown 등이 실행됩니다.
  app.enableShutdownHooks();

  await app.listen(3000);
  console.log('API Gateway가 3000번 포트에서 작동 중입니다.');
}
bootstrap();