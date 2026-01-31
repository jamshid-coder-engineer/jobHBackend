import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { VacancyService } from './vacancy.service';
import { CreateVacancyDto } from './dto/create-vacancy.dto';
import { UpdateVacancyDto } from './dto/update-vacancy.dto';
import { VacancyQueryDto } from './dto/vacancy-query.dto';

import { AuthGuard } from 'src/common/guard/authGuard';
import { RolesGuard } from 'src/common/guard/roleGuard';
import { accessRoles } from 'src/common/decorator/roles.decorator';
import { CurrentUser } from 'src/common/decorator/currentUser.decorator';
import { Roles } from 'src/common/enum/roles.enum';

@Controller('vacancies')
export class VacancyController {
  constructor(private readonly vacancyService: VacancyService) {}

  // PUBLIC LIST
  @Get()
  @accessRoles('public')
  list(@Query() query: VacancyQueryDto) {
    return this.vacancyService.listPublic(query);
  }

  // PUBLIC DETAILS
  @Get(':id')
  @accessRoles('public')
  one(@Param('id') id: string) {
    return this.vacancyService.findOne(id);
  }

  // CREATE (Employer)
  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @accessRoles(Roles.TEACHER)
  create(@CurrentUser() user: any, @Body() dto: CreateVacancyDto) {
    return this.vacancyService.create(user, dto);
  }

  // UPDATE (Owner/Admin)
  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @accessRoles(Roles.TEACHER, Roles.ADMIN, Roles.SUPER_ADMIN)
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateVacancyDto) {
    return this.vacancyService.update(user, id, dto);
  }
}
