import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';

import { config } from './config';
import { AuthModule } from './api/auth/auth.module';
import { CompanyModule } from './api/company/company.module';
import { VacancyModule } from './api/vacancy/vacancy.module';
import { ResumeModule } from './api/resume/resume.module';
import { ApplicationModule } from './api/application/application.module';
import { TokenModule } from './infrastructure';
import { AdminModule } from './api/admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      useFactory: async () => {
        console.log('⏳ Connecting to PostgreSQL...');
        return {
          type: 'postgres' as const,
          url: config.DB.URL,
          synchronize: true,
          autoLoadEntities: true,
          entities: ['dist/core/entity/*.entity{.ts,.js}'],
          ssl: config.APP.NODE_ENV === 'production'
              ? { rejectUnauthorized: false }
              : false,
        };
      },
    }),

    MailerModule.forRoot({
      transport: {
        host: config.MAIL.HOST,
        port: config.MAIL.PORT,
        secure: true,
        auth: {
          user: config.MAIL.USER,
          pass: config.MAIL.PASS,
        },
      },
      defaults: {
        from: `"HH Job System" <${config.MAIL.USER}>`,
      },
    }),

    JwtModule.register({ global: true }),
    AuthModule,
    CompanyModule,
    VacancyModule,
    ResumeModule,
    ApplicationModule,
    TokenModule,
    AdminModule,
  ],
})
export class AppModule {}
