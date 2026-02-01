import * as dotenv from 'dotenv';
dotenv.config();

function mustGet(key: string): string {
  const v = process.env[key];
  if (!v || v.trim() === '') throw new Error(`Missing ENV: ${key}`);
  return v;
}

function mustNumber(key: string): number {
  const v = Number(mustGet(key));
  if (Number.isNaN(v)) throw new Error(`ENV must be a number: ${key}`);
  return v;
}

function boolEnv(key: string, defaultValue = false): boolean {
  const v = process.env[key];
  if (v === undefined) return defaultValue;
  return ['true', '1', 'yes', 'y'].includes(v.toLowerCase());
}

export type NodeEnv = 'development' | 'production' | 'test';

export interface AppConfig {
  APP: { PORT: number; NODE_ENV: NodeEnv; API_PREFIX: string };
  DB: { URL: string };
  // Redis qismi qo'shildi
  REDIS: {
    HOST: string;
    PORT: number;
    PASS: string;
    URL: string;
  };
  JWT: {
    ACCESS_SECRET: string;
    ACCESS_EXPIRES_IN: number;
    REFRESH_SECRET: string;
    REFRESH_EXPIRES_IN: number;
  };
  SUPER_ADMIN: { EMAIL: string; PASSWORD: string; FULLNAME: string };
  UPLOAD: { FOLDER: string };
  CORS: { ORIGIN: string; CREDENTIALS: boolean };
  MAIL: {
    HOST: string;
    PORT: number;
    USER: string;
    PASS: string;
  };
}

export const config: AppConfig = {
  APP: {
    PORT: mustNumber('PORT'),
    NODE_ENV: mustGet('NODE_ENV') as NodeEnv,
    API_PREFIX: process.env.API_PREFIX || '/api/v1',
  },
  DB: { URL: mustGet('DB_URL') },
  // Redis konfiguratsiyasi
  REDIS: {
    HOST: mustGet('REDIS_HOST'),
    PORT: mustNumber('REDIS_PORT'),
    PASS: mustGet('REDIS_PASSWORD'),
    // Redis URL format: redis://:password@host:port
    URL: `redis://:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
  },
  JWT: {
    ACCESS_SECRET: mustGet('JWT_ACCESS_SECRET'),
    ACCESS_EXPIRES_IN: mustNumber('JWT_ACCESS_EXPIRES_IN'),
    REFRESH_SECRET: mustGet('JWT_REFRESH_SECRET'),
    REFRESH_EXPIRES_IN: mustNumber('JWT_REFRESH_EXPIRES_IN'),
  },
  SUPER_ADMIN: {
    EMAIL: mustGet('SUPER_ADMIN_EMAIL'),
    PASSWORD: mustGet('SUPER_ADMIN_PASSWORD'),
    FULLNAME: mustGet('SUPER_ADMIN_FULLNAME'),
  },
  UPLOAD: { FOLDER: process.env.UPLOAD_FOLDER || 'uploads' },
  CORS: {
    ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
    CREDENTIALS: boolEnv('CORS_CREDENTIALS', true),
  },
  MAIL: {
    HOST: mustGet('MAIL_HOST'),
    PORT: mustNumber('MAIL_PORT'),
    USER: mustGet('MAIL_USER'),
    PASS: mustGet('MAIL_PASS'),
  },
};