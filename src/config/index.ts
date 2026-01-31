import * as dotenv from 'dotenv';
dotenv.config();

/* -------------------- helpers -------------------- */
function mustGet(key: string): string {
  const v = process.env[key];
  if (!v || v.trim() === '') {
    throw new Error(`❌ Missing ENV: ${key}`);
  }
  return v;
}

function mustNumber(key: string): number {
  const v = Number(mustGet(key));
  if (Number.isNaN(v)) {
    throw new Error(`❌ ENV must be a number: ${key}`);
  }
  return v;
}

function boolEnv(key: string, defaultValue = false): boolean {
  const v = process.env[key];
  if (v === undefined) return defaultValue;
  return ['true', '1', 'yes', 'y'].includes(v.toLowerCase());
}

/* -------------------- types -------------------- */
export type NodeEnv = 'development' | 'production' | 'test';

export interface AppConfig {
  APP: {
    PORT: number;
    NODE_ENV: NodeEnv;
    API_PREFIX: string;
  };

  DB: {
    URL: string;
  };

  JWT: {
    ACCESS_SECRET: string;
    ACCESS_EXPIRES_IN: number; // seconds
    REFRESH_SECRET: string;
    REFRESH_EXPIRES_IN: number; // seconds
  };

  SUPER_ADMIN: {
    USERNAME: string;
    PASSWORD: string;
    FULLNAME: string;
  };

  UPLOAD: {
    FOLDER: string;
  };

  CORS: {
    ORIGIN: string;
    CREDENTIALS: boolean;
  };
}

/* -------------------- config -------------------- */
export const config: AppConfig = {
  APP: {
    PORT: mustNumber('PORT'),
    NODE_ENV: mustGet('NODE_ENV') as NodeEnv,
    API_PREFIX: process.env.API_PREFIX || '/api/v1',
  },

  DB: {
    URL: mustGet('DB_URL'),
  },

  JWT: {
    ACCESS_SECRET: mustGet('JWT_ACCESS_SECRET'),
    ACCESS_EXPIRES_IN: mustNumber('JWT_ACCESS_EXPIRES_IN'),
    REFRESH_SECRET: mustGet('JWT_REFRESH_SECRET'),
    REFRESH_EXPIRES_IN: mustNumber('JWT_REFRESH_EXPIRES_IN'),
  },

  SUPER_ADMIN: {
    USERNAME: mustGet('SUPER_ADMIN_USERNAME'),
    PASSWORD: mustGet('SUPER_ADMIN_PASSWORD'),
    FULLNAME: mustGet('SUPER_ADMIN_FULLNAME'),
  },

  UPLOAD: {
    FOLDER: process.env.UPLOAD_FOLDER || 'uploads',
  },

  CORS: {
    ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
    CREDENTIALS: boolEnv('CORS_CREDENTIALS', true),
  },
};
