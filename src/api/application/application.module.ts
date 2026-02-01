import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Application } from 'src/core/entity/application.entity';
import { Vacancy } from 'src/core/entity/vacancy.entity';
import { User } from 'src/core/entity/user.entity';

import { ApplicationController } from '../application/application.controller';
import { ApplicationService } from './application.service';
import { VacancyModule } from '../vacancy/vacancy.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Application, Vacancy, User]),
    VacancyModule,
  ],
  controllers: [ApplicationController],
  providers: [ApplicationService],
})
export class ApplicationModule {}
