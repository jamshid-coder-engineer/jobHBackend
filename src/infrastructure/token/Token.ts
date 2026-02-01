import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Response } from 'express';

import { config } from 'src/config';
import type { ITokenPayload } from 'src/api/auth/auth.service'; 

@Injectable()
export class TokenService {
  constructor(private readonly jwt: JwtService) {}

  signAccessToken(payload: ITokenPayload) {
    return this.jwt.signAsync(payload, {
      secret: config.JWT.ACCESS_SECRET,
      expiresIn: config.JWT.ACCESS_EXPIRES_IN, 
    });
  }

  signRefreshToken(payload: ITokenPayload) {
    return this.jwt.signAsync(payload, {
      secret: config.JWT.REFRESH_SECRET,
      expiresIn: config.JWT.REFRESH_EXPIRES_IN, 
    });
  }

  writeCookie(res: Response, key: string, value: string, timeSeconds: number) {
    res.cookie(key, value, {
      httpOnly: true,
      secure: config.APP.NODE_ENV === 'production',
      sameSite: config.APP.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: timeSeconds * 1000,
      path: '/',
    });
  }

  async verifyAccessToken(token: string): Promise<ITokenPayload> {
    return this.jwt.verifyAsync<ITokenPayload>(token, {
      secret: config.JWT.ACCESS_SECRET,
    });
  }

  async verifyRefreshToken(token: string): Promise<ITokenPayload> {
    return this.jwt.verifyAsync<ITokenPayload>(token, {
      secret: config.JWT.REFRESH_SECRET,
    });
  }
}
