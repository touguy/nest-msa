import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AppController } from './app.controller';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'MATH_SERVICE',
        transport: Transport.TCP,
        options: {
          host: '127.0.0.1', // Math Service의 IP
          port: 8888,        // Math Service의 포트
        },
      },
    ]),
  ],
  controllers: [AppController],
})
export class AppModule { }