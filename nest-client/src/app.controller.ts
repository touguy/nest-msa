import { Controller, Get, Inject, Query, OnModuleInit, ParseArrayPipe } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { timeout, catchError } from 'rxjs/operators';
import { of, firstValueFrom } from 'rxjs';

@Controller('math')
export class AppController implements OnModuleInit {
  constructor(
    @Inject('MATH_KAFKA_SERVICE') private readonly client: ClientKafka,
  ) { }

  // 카프카는 응답을 기다리기 위해 토픽에 연결하는 과정이 필요함
  async onModuleInit() {
    this.client.subscribeToResponseOf('math.sum'); // 응답받을 토픽 등록
    await this.client.connect();
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
    // 1. emit()은 이벤트를 발행하고 즉시 반환합니다.
    // 2. 응답을 기다리지 않으므로 timeout 설정이 필요 없습니다.
    this.client.emit('math.sum.event', { value: data });

    return {
      message: '이벤트가 카프카로 전송되었습니다. 결과는 나중에 처리됩니다.',
      sentData: data,
    };
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