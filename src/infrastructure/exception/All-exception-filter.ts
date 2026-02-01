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

function defaultErrorName(status: number) {
  switch (status) {
    case 400:
      return 'Bad Request';
    case 401:
      return 'Unauthorized';
    case 403:
      return 'Forbidden';
    case 404:
      return 'Not Found';
    case 409:
      return 'Conflict';
    case 422:
      return 'Unprocessable Entity';
    case 429:
      return 'Too Many Requests';
    default:
      return status >= 500 ? 'Internal Server Error' : 'Error';
  }
}

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
    let errorType = defaultErrorName(httpStatus);

    if (exception instanceof HttpException) {
      httpStatus = exception.getStatus();
      const response = exception.getResponse();

      errorType = defaultErrorName(httpStatus);

      if (typeof response === 'string') {
        message = response;
      } else if (typeof response === 'object' && response !== null) {
        const resp: any = response;

        if (resp.message !== undefined) {
          message = resp.message;
        } else if (resp.error !== undefined) {
          message = resp.error;
        }

        if (typeof resp.error === 'string' && resp.error.trim() !== '') {
          errorType = resp.error;
        }
      }

      if (httpStatus === 429) {
        errorType = 'Too Many Requests';
        if (message === 'Internal server error') message = 'Too many requests';
      }
    } else if (exception instanceof QueryFailedError) {
      const code = (exception as any).code;

      if (code === '23505') {
        httpStatus = HttpStatus.CONFLICT;
        errorType = 'Conflict';
        message = 'Duplicate entry';
      } else {
        httpStatus = HttpStatus.BAD_REQUEST;
        errorType = 'Database Error';
        message = 'Database error';
      }
    } else if (
      exception &&
      typeof exception === 'object' &&
      'statusCode' in exception
    ) {
      const errObj = exception as any;
      httpStatus = errObj.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
      message = errObj.message ?? message;
      errorType = errObj.error || defaultErrorName(httpStatus);
    } else {
      httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
      errorType = defaultErrorName(httpStatus);
      message = 'Internal server error';
    }

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
      error: errorType,
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
        (exception as any)?.stack || undefined,
      );
    } else {
      this.logger.warn(`CLIENT ERROR | ${JSON.stringify(logPayload)}`);
    }

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
