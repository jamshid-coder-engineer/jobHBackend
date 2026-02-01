import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Application } from 'src/core/entity/application.entity';
import { Vacancy } from 'src/core/entity/vacancy.entity';
import { User } from 'src/core/entity/user.entity';

import { ApplicationController } from '../application/application.controller';
import { ApplicationService } from './application.service';
// 1. VacancyModule'ni import qiling
import { VacancyModule } from '../vacancy/vacancy.module'; // Yo'lni tekshiring

@Module({
  imports: [
    TypeOrmModule.forFeature([Application, Vacancy, User]),
    VacancyModule, // 2. Bu yerga VacancyModule'ni qo'shing
  ],
  controllers: [ApplicationController],
  providers: [ApplicationService],
})
export class ApplicationModule {}