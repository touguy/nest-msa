import { Controller, Get, Inject, Query, OnModuleInit, OnModuleDestroy, ParseArrayPipe, HttpException, HttpStatus } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { timeout, catchError } from 'rxjs/operators';
import { of, firstValueFrom } from 'rxjs';

@Controller('math')
export class AppController implements OnModuleInit, OnModuleDestroy {
  constructor(
    @Inject('MATH_KAFKA_SERVICE') private readonly client: ClientKafka,
  ) { }

  // 카프카는 응답을 기다리기 위해 토픽에 연결하는 과정이 필요함
  async onModuleInit() {
    this.client.subscribeToResponseOf('math.sum'); // 응답받을 토픽 등록
    await this.client.connect();
  }

  // [종료 시] 서버 종료 신호가 들어오면 실행
  async onModuleDestroy() {
    console.log('서버 종료 신호 수신: 카프카 연결을 정리합니다...');

    // 4. 연결을 안전하게 닫음 (Graceful Shutdown)
    await this.client.close();

    console.log('카프카 연결 종료 완료.');
  }

  @Get('add')
  getSum(@Query('data', new ParseArrayPipe({ items: Number, separator: ',' })) data: number[]) {
    // 카프카에서는 패턴 이름이 '토픽(Topic)' 이름이 됩니다.
    return this.client.send('math.sum', { value: data }).pipe(
      timeout(5000), // 5초 안에 응답 없으면 에러 발생
      catchError((err) => {
        console.error('타임아웃 또는 에러 발생:', err.message);
        return of('서버가 응답하지 않습니다. 나중에 다시 시도해주세요.');
      }),
    );
  }

  @Get('emit-add')
  async emitSum(@Query('data', new ParseArrayPipe({ items: Number, separator: ',' })) data: number[]) {
    try {
      // 1. 카프카에 발행 시도
      // emit()도 내부적으로 acks 설정에 따라 브로커의 확인을 기다립니다.
      const result$ = this.client.emit('math.sum.event', { value: data }).pipe(timeout(5000)); // 5초 타임아웃 설정;

      // 2. 브로커에 성공적으로 기록될 때까지 await
      await firstValueFrom(result$);

      // 3. 발행 성공 후 유저에게 응답
      return { status: 'Success', message: '이벤트가 카프카에 저장되었습니다.', sentData: data };

    } catch (error) {
      // 4. 발행 실패 시 (카프카 다운 등) 에러 응답
      throw new HttpException('카프카 전송 실패', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  @Get('load-test')
  async loadTest() {
    // 1. 타입을 명시합니다. (Promise 객체가 담기는 배열임을 선언)
    const requests: Promise<number>[] = [];

    for (let i = 1; i <= 100; i++) {
      console.log(`${i}번째 요청 전송`);

      const source$ = this.client.send<number>('math.sum', { value: [i, i + 1] });
      requests.push(firstValueFrom(source$));
    }

    const results = await Promise.all(requests);
    return `100개 요청 처리 완료! 결과 예시: 1번=${results[0]}, 100번=${results[99]}`;
  }
}