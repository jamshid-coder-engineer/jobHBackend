import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { CompanyModule } from '../company/company.module';
import { VacancyModule } from '../vacancy/vacancy.module';
import { Company } from 'src/core/entity/company.entity';
import { Vacancy } from 'src/core/entity/vacancy.entity';
import { Application } from 'src/core/entity/application.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Company, Vacancy, Application]),
    CompanyModule, 
    VacancyModule
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}