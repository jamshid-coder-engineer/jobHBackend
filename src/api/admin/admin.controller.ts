import { Controller, Get, Param, Patch, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { Roles } from 'src/common/enum/roles.enum';
import { accessRoles } from 'src/common/decorator/roles.decorator';
import { CurrentUser } from 'src/common/decorator/currentUser.decorator';
import { AuthGuard } from 'src/common/guard/authGuard';
import { RolesGuard } from 'src/common/guard/roleGuard';
import { CompanyService } from '../company/company.service';
import { VacancyService } from '../vacancy/vacancy.service';

@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@accessRoles(Roles.ADMIN, Roles.SUPER_ADMIN)
export class AdminController {
    constructor(
        private readonly companyService: CompanyService,
        private readonly vacancyService: VacancyService,
    ) { }

    // Toggle Company Active
    @Patch('companies/:id/status')
    toggleCompany(@CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
        return this.companyService.toggleCompanyStatus(user, id);
    }

    // Toggle Vacancy Active
    @Patch('vacancies/:id/status')
    toggleVacancy(@CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
        return this.vacancyService.toggleVacancyStatus(user, id);
    }

    // List Companies (admin view) - isActive filter yo‘q (hammasi)
    @Get('companies')
    listCompanies(@CurrentUser() user: any, @Query('page') page = '1', @Query('limit') limit = '10') {
        return this.companyService.listAdmin(user, Number(page), Number(limit));
    }

    @Get('vacancies')
    listVacancies(@CurrentUser() user: any, @Query('page') page = '1', @Query('limit') limit = '10') {
        return this.vacancyService.listAdmin(user, Number(page), Number(limit));
    }

}
