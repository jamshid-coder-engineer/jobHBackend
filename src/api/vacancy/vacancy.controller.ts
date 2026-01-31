import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';

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
@Get()
list(@Query() query: VacancyQueryDto) {
  return this.vacancyService.listPublic(query);
}

@Get('employer')
@UseGuards(AuthGuard, RolesGuard)
@accessRoles(Roles.TEACHER)@Get('employer')
@UseGuards(AuthGuard, RolesGuard)
@accessRoles(Roles.TEACHER)
employerList(@CurrentUser() user: any, @Query() query: VacancyQueryDto) {
  return this.vacancyService.listEmployer(user, query);
}

@Get(':id')
one(@Param('id', ParseUUIDPipe) id: string) {
  return this.vacancyService.findOneVacancy(id);
}

@Post()
@UseGuards(AuthGuard, RolesGuard)
@accessRoles(Roles.TEACHER)
create(@CurrentUser() user: any, @Body() dto: CreateVacancyDto) {
  return this.vacancyService.createVacancy(user, dto);
}

@Patch(':id')
@UseGuards(AuthGuard, RolesGuard)
@accessRoles(Roles.TEACHER, Roles.ADMIN, Roles.SUPER_ADMIN)
update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateVacancyDto) {
  return this.vacancyService.updateVacancy(user, id, dto);
}

}
