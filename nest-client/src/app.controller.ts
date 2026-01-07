import { Controller, Get, Inject, Query, ParseArrayPipe } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Controller('math')
export class AppController {
  constructor(
    @Inject('MATH_SERVICE') private readonly client: ClientProxy,
  ) { }

  @Get('add')
  async getSum(@Query('data', new ParseArrayPipe({ items: Number, separator: ',' })) data: number[]) {
    // 마이크로서비스로 'add' 패턴과 데이터를 전송
    return this.client.send({ cmd: 'add' }, data);
  }
}