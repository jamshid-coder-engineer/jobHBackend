import { Body, Controller, Get, Patch, Param, Query, UseGuards, Post, Delete } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from 'src/common/guard/authGuard';
import { RolesGuard } from 'src/common/guard/roleGuard';
import { accessRoles } from 'src/common/decorator/roles.decorator';
import { Roles, CompanyStatus, VacancyStatus } from 'src/common/enum/roles.enum';
import { CompanyService } from 'src/api/company/company.service';
import { VacancyService } from 'src/api/vacancy/vacancy.service';
import { AdminService } from './admin.service'; 
import { AdminSetPremiumDto } from 'src/api/vacancy/dto/admin-set-premium.dto';
import { AdminRejectVacancyDto } from '../vacancy/dto/admin-reject.dto';
import { CreateAdminDto } from './dto/create-admin.dto';

@ApiTags('Admin')
@ApiBearerAuth('bearer')
@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@accessRoles(Roles.ADMIN, Roles.SUPER_ADMIN)
export class AdminController {
  constructor(
    private readonly companyService: CompanyService,
    private readonly vacancyService: VacancyService,
    private readonly adminService: AdminService, 
  ) {}

  @Get('statistics')
  @ApiOperation({ summary: 'Admin uchun umumiy statistika va dashboard' })
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('companies')
  @ApiOperation({ summary: 'Barcha kompaniyalarni status boyicha korish' })
  listCompanies(@Query('status') status?: CompanyStatus) {
    return this.companyService.adminList(status);
  }

@Post('create')
  @accessRoles(Roles.SUPER_ADMIN) 
  @ApiOperation({ summary: 'Yangi admin yaratish (Faqat Super Admin)' })
  createAdmin(@Body() dto: CreateAdminDto) {
    return this.adminService.createAdmin(dto);
  }

 @Get('vacancies')
  @ApiOperation({ summary: 'Moderatsiyadagi vakansiyalarni korish' })
  listVacancies(@Query('status') status?: VacancyStatus) {
    return this.vacancyService.adminList(status);
  }

  @Get('list')
  @accessRoles(Roles.SUPER_ADMIN) 
  @ApiOperation({ summary: 'Adminlar royxati' })
  listAdmins() {
    return this.adminService.listAdmins();
  }

  @Delete(':id')
  @accessRoles(Roles.SUPER_ADMIN)
  @ApiOperation({ summary: 'Adminni ochirish' })
  deleteAdmin(@Param('id') id: string) {
    return this.adminService.deleteAdmin(id);
  }

  
  @Patch('companies/:id/approve')
  @ApiOperation({ summary: 'Kompaniyani tasdiqlash' })
  approveCompany(@Param('id') id: string) {
    return this.companyService.adminApprove(id);
  }

  @Patch('companies/:id/reject')
  @ApiOperation({ summary: 'Kompaniyani rad etish' })
  rejectCompany(@Param('id') id: string, @Body() body: { reason?: string }) {
    return this.companyService.adminReject(id, body?.reason);
  }

  @Patch('companies/:id/verify')
  @ApiOperation({ summary: 'Kompaniyaga verified statusini berish' })
  verifyCompany(@Param('id') id: string) {
    return this.companyService.adminVerify(id, true);
  }

  @Patch('vacancies/:id/approve')
  @ApiOperation({ summary: 'Vakansiyani nashrga ruxsat berish' })
  approveVacancy(@Param('id') id: string) {
    return this.vacancyService.adminApprove(id);
  }

  @Patch('vacancies/:id/reject')
  @ApiOperation({ summary: 'Vakansiyani rad etish (sababi bilan)' })
  rejectVacancy(
    @Param('id') id: string, 
    @Body() dto: AdminRejectVacancyDto 
  ) {
    return this.vacancyService.adminReject(id, dto.reason);
  }

  @Patch('vacancies/:id/premium')
  @ApiOperation({ summary: 'Vakansiyani admin tomonidan premium qilish' })
  setPremium(@Param('id') id: string, @Body() dto: AdminSetPremiumDto) {
    return this.vacancyService.adminSetPremium(id, dto.days);
  }
}