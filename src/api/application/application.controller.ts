import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';

import { ApplicationService } from './application.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';

import { AuthGuard } from 'src/common/guard/authGuard';
import { RolesGuard } from 'src/common/guard/roleGuard';
import { accessRoles } from 'src/common/decorator/roles.decorator';
import { CurrentUser } from 'src/common/decorator/currentUser.decorator';
import { Roles } from 'src/common/enum/roles.enum';

@Controller('applications')
@UseGuards(AuthGuard, RolesGuard)
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  // STUDENT apply
  @Post()
  @accessRoles(Roles.STUDENT)
  apply(@CurrentUser() user: any, @Body() dto: CreateApplicationDto) {
    return this.applicationService.apply(user, dto);
  }

  // STUDENT my applications
  @Get('me')
  @accessRoles(Roles.STUDENT)
  my(@CurrentUser() user: any) {
    return this.applicationService.myApplications(user);
  }

  // TEACHER applications for my vacancies
  @Get('employer')
  @accessRoles(Roles.TEACHER)
  employer(@CurrentUser() user: any) {
    return this.applicationService.employerApplications(user);
  }

  // TEACHER owner OR ADMIN status update
  @Patch(':id/status')
  @accessRoles(Roles.TEACHER, Roles.ADMIN, Roles.SUPER_ADMIN)
  updateStatus(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    return this.applicationService.updateStatus(user, id, dto);
  }
}
