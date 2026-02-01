import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { VacancyService } from './vacancy.service';
import { CreateVacancyDto } from './dto/create-vacancy.dto';
import { UpdateVacancyDto } from './dto/update-vacancy.dto';
import { VacancyQueryDto } from './dto/vacancy-query.dto';

import { AuthGuard } from 'src/common/guard/authGuard';
import { RolesGuard } from 'src/common/guard/roleGuard';
import { accessRoles } from 'src/common/decorator/roles.decorator';
import { CurrentUser } from 'src/common/decorator/currentUser.decorator';
import { Roles } from 'src/common/enum/roles.enum';
import { BuyPremiumDto } from './dto/buy-premium.dto';

@ApiTags('Vacancy')
@Controller('vacancies')
export class VacancyController {
  constructor(private readonly vacancyService: VacancyService) {}

  // PUBLIC list
  @Get()
  @accessRoles('public')
  list(@Query() query: VacancyQueryDto) {
    return this.vacancyService.listPublic(query);
  }

  // employer create (DRAFT)
  @ApiBearerAuth('bearer')
  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @accessRoles(Roles.EMPLOYER)
  create(@CurrentUser() user: any, @Body() dto: CreateVacancyDto) {
    return this.vacancyService.create(user, dto);
  }

  // employer update
  @ApiBearerAuth('bearer')
  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @accessRoles(Roles.EMPLOYER)
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateVacancyDto) {
    return this.vacancyService.update(user, id, dto);
  }

  // ✅ employer submit for moderation
  @ApiBearerAuth('bearer')
  @Patch(':id/submit')
  @UseGuards(AuthGuard, RolesGuard)
  @accessRoles(Roles.EMPLOYER)
  submit(@CurrentUser() user: any, @Param('id') id: string) {
    return this.vacancyService.submitForModeration(user, id);
  }
@ApiBearerAuth('bearer')
@Patch(':id/premium')
@UseGuards(AuthGuard, RolesGuard)
@accessRoles(Roles.EMPLOYER, Roles.ADMIN, Roles.SUPER_ADMIN)
buyPremium(
  @CurrentUser() user: any,
  @Param('id') id: string,
  @Body() dto: BuyPremiumDto,
) {
  return this.vacancyService.buyPremium(user, id, dto);
}

}
