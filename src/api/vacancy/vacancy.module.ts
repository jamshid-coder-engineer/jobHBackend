import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Vacancy } from 'src/core/entity/vacancy.entity';
import { Company } from 'src/core/entity/company.entity';

import { VacancyController } from './vacancy.controller';
import { VacancyService } from './vacancy.service';

@Module({
  imports: [TypeOrmModule.forFeature([Vacancy, Company])],
  controllers: [VacancyController],
  providers: [VacancyService],
  exports: [VacancyService],
})
export class VacancyModule {}
