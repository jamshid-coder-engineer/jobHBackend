import {
  ClassSerializerInterceptor,
  HttpStatus,
  Injectable,
  ValidationPipe,
} from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import * as express from 'express';
import { join } from 'path';
import { HttpAdapterHost } from '@nestjs/core';
import { AllExceptionsFilter } from './infrastructure/exception/All-exception-filter';

import { AppModule } from './app.module';
import { config } from './config';

@Injectable()
class AppService {
  async main() {
    const app = await NestFactory.create(AppModule);

    // CORS
    app.enableCors({
      origin: config.CORS.ORIGIN,
      credentials: config.CORS.CREDENTIALS,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    });

    // Global prefix
    app.setGlobalPrefix(config.APP.API_PREFIX);

    // cookie
    app.use(cookieParser());

    // Serialization
    app.useGlobalInterceptors(
      new ClassSerializerInterceptor(app.get(Reflector)),
    );
    const httpAdapter = app.get(HttpAdapterHost);
    app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));

    // Validation
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

          // Nest default exception o‘rniga “uniform” format
          return {
            statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
            message: messages,
            error: 'Unprocessable Entity',
          } as any;
        },
      }),
    );

    const staticFile = join(__dirname, `../${config.UPLOAD.FOLDER}`);
    app.use(`/${config.APP.API_PREFIX}/${config.UPLOAD.FOLDER}`, express.static(staticFile));


    // Swagger
    const swaggerConfig = new DocumentBuilder()
      .setTitle('EduCRM API')
      .setDescription('EduCRM backend API documentation')
      .setVersion('1.0.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'access-token',
      )
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api', app, document);

    await app.listen(config.APP.PORT);
    console.log(`🚀 HH Job API: http://localhost:${config.APP.PORT}${config.APP.API_PREFIX}`);
    console.log(`📚 Swagger: http://localhost:${config.APP.PORT}/api`);

  }
}

export default new AppService();
