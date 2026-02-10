import {
  ClassSerializerInterceptor,
  HttpException,
  HttpStatus,
  Injectable,
  ValidationPipe,
} from '@nestjs/common';
import { NestFactory, Reflector, HttpAdapterHost } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import cookieParser from 'cookie-parser';

import { AppModule } from './app.module';
import { config } from './config';
import { AllExceptionsFilter } from './infrastructure/exception/All-exception-filter';

@Injectable()
export class AppService {
  async main() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    app.enableCors({
      origin: true,
      credentials: true,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    });

    app.setGlobalPrefix(config.APP.API_PREFIX);

    app.use(cookieParser());

    app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
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

    const uploadPath = join(process.cwd(), 'uploads');
    app.useStaticAssets(uploadPath, {
      prefix: '/uploads/',
    });

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

export default new AppService();