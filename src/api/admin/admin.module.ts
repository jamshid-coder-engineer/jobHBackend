import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { CompanyModule } from '../company/company.module';
import { VacancyModule } from '../vacancy/vacancy.module';

@Module({
  imports: [CompanyModule, VacancyModule],
  controllers: [AdminController],
})
export class AdminModule {}
