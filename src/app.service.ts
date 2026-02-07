import {
  ClassSerializerInterceptor,
  HttpException,
  HttpStatus,
  Injectable,
  ValidationPipe,
} from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
// 👇 1. XATOLIK TUZATILDI: (import * as emas, shunchaki import)
import cookieParser from 'cookie-parser';
import { join } from 'path';
import { HttpAdapterHost } from '@nestjs/core';
import { AllExceptionsFilter } from './infrastructure/exception/All-exception-filter';

import { AppModule } from './app.module';
import { config } from './config';
import { NestExpressApplication } from '@nestjs/platform-express';

@Injectable()
export class AppService {
  // 👇 bootstrap() o'rniga main() metodi
  async main() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    app.enableCors({
      origin: true,
      credentials: true,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    });

    app.setGlobalPrefix(config.APP.API_PREFIX);

    // 👇 Endi bu qator xato bermaydi
    app.use(cookieParser());

    app.useGlobalInterceptors(
      new ClassSerializerInterceptor(app.get(Reflector)),
    );
    const httpAdapter = app.get(HttpAdapterHost);
    app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        transformOptions: { enableImplicitConversion: true },
        validationError: { target: false },
        stopAtFirstError: true,
        disableErrorMessages: config.APP.NODE_ENV === 'production',

        exceptionFactory: (errors) => {
          const messages = errors
            .map((err) => Object.values(err.constraints || {}))
            .flat();

          throw new HttpException(
            {
              statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
              error: 'Unprocessable Entity',
              message: messages,
            },
            HttpStatus.UNPROCESSABLE_ENTITY,
          );
        },
      }),
    );

    // 🔥 STATIC ASSETS
    const uploadPath = join(process.cwd(), 'uploads'); 

    app.useStaticAssets(uploadPath, {
      prefix: '/uploads/',
    });

    // Swagger Config
    const swaggerConfig = new DocumentBuilder()
      .setTitle('HH Job System API')
      .setDescription('Ish qidirish va vakansiyalar boshqaruvi tizimi')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          in: 'header',
          name: 'Authorization',
        },
        'bearer',
      )
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api', app, document);

    await app.listen(config.APP.PORT);
    
    console.log(`--------------------------------------------------`);
    console.log(`🚀 API:        http://localhost:${config.APP.PORT}/${config.APP.API_PREFIX}`);
    console.log(`📂 Uploads:    ${uploadPath}`); 
    console.log(`🖼  Static URL: http://localhost:${config.APP.PORT}/uploads/`);
    console.log(`--------------------------------------------------`);
  }
}

// 👇 2. XATOLIK TUZATILDI: main.ts dan import qilish uchun default export
export default new AppService();