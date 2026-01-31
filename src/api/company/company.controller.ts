import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';

import { CompanyService } from './company.service';
import { CreateCompanyDto } from './dto/com.create.dto';
import { UpdateCompanyDto } from './dto/com.update.dto';

import { AuthGuard } from 'src/common/guard/authGuard';
import { RolesGuard } from 'src/common/guard/roleGuard';
import { accessRoles } from 'src/common/decorator/roles.decorator';
import { CurrentUser } from 'src/common/decorator/currentUser.decorator';
import { Roles } from 'src/common/enum/roles.enum';

@Controller('companies')
@UseGuards(AuthGuard, RolesGuard)
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post()
  @accessRoles(Roles.TEACHER)
  create(@CurrentUser() user: any, @Body() dto: CreateCompanyDto) {
    return this.companyService.create(user, dto);
  }

  @Get('me')
  @accessRoles(Roles.TEACHER, Roles.ADMIN, Roles.SUPER_ADMIN)
  myCompany(@CurrentUser() user: any) {
    return this.companyService.getMyCompany(user);
  }

  @Patch(':id')
  @accessRoles(Roles.TEACHER, Roles.ADMIN, Roles.SUPER_ADMIN)
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateCompanyDto) {
    return this.companyService.update(user, id, dto);
  }

  @Patch(':id/status')
  @accessRoles(Roles.ADMIN, Roles.SUPER_ADMIN)
  toggleStatus(@CurrentUser() user: any, @Param('id') id: string) {
    return this.companyService.toggleStatus(user, id);
  }
}
