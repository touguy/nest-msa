import { Controller, Get, Inject, Query, OnModuleInit, ParseArrayPipe } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';

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
    return this.client.send('math.sum', { value: data });
  }
}