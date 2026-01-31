import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import type { Request } from 'express';
import { QueryFailedError } from 'typeorm';
import * as geoip from 'geoip-lite';

@Catch()

export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;

    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();

    let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let errorType = 'InternalServerError';

    // 1) NestJS HttpException
    if (exception instanceof HttpException) {
      httpStatus = exception.getStatus();
      const responseBody = exception.getResponse();

      if (httpStatus === 429) {
        message = 'Too many requests';
        errorType = 'TooManyRequests';
      } else if (typeof responseBody === 'string') {
        message = responseBody;
      } else if (typeof responseBody === 'object' && responseBody !== null) {
        const msg = (responseBody as any).message;
        message = Array.isArray(msg)
          ? msg
          : msg || (responseBody as any).error || message;

        errorType = (responseBody as any).error || errorType;
      }
    }

    // 2) TypeORM QueryFailedError (DB errors)
    else if (exception instanceof QueryFailedError) {
      const code = (exception as any).code;

      if (code === '23505') {
        httpStatus = HttpStatus.CONFLICT;
        message = 'Duplicate entry';
        errorType = 'Conflict';
      } else {
        httpStatus = HttpStatus.BAD_REQUEST;
        message = 'Database error';
        errorType = 'DatabaseError';
      }
    }

    // 3) Sizning ValidationPipe exceptionFactory() qaytargan oddiy object xatolaringiz
    else if (
      exception &&
      typeof exception === 'object' &&
      'statusCode' in exception
    ) {
      const errObj = exception as any;
      httpStatus = errObj.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
      message = errObj.message || message;
      errorType = errObj.error || errorType;
    }

    // IP + country + device logging
    const xff = request.headers['x-forwarded-for'];
    const clientIp =
      (typeof xff === 'string' ? xff.split(',')[0].trim() : undefined) ||
      request.ip ||
      'Unknown IP';

    const geo = geoip.lookup(clientIp);
    const country = geo?.country || 'Unknown/Local';
    const device = request.headers['user-agent'] || 'Unknown Device';

    const logPayload = {
      statusCode: httpStatus,
      errorType,
      message,
      path: request.originalUrl || request.url,
      method: request.method,
      ip: clientIp,
      country,
      device,
      timestamp: new Date().toISOString(),
    };

    if (httpStatus >= 500) {
      this.logger.error(
        `SERVER ERROR | ${JSON.stringify(logPayload)}`,
        (exception as Error)?.stack || undefined,
      );
    } else {
      this.logger.warn(`CLIENT ERROR | ${JSON.stringify(logPayload)}`);
    }

    // Client response
    const responseBody = {
      statusCode: httpStatus,
      error: errorType,
      message,
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(request),
      method: request.method,
    };

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}
