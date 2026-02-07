import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vacancy } from 'src/core/entity/vacancy.entity';
import { Company } from 'src/core/entity/company.entity';
import { VacancyService } from './vacancy.service';
import { VacancyController } from './vacancy.controller';
import { User } from 'src/core/entity/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Vacancy, Company, User])],
  controllers: [VacancyController],
  providers: [VacancyService],
  exports: [VacancyService],
})
export class VacancyModule {}
