import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { ApplicationService } from './application.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';
import { ApplicationQueryDto } from './dto/application-query.dto';

import { AuthGuard } from 'src/common/guard/authGuard';
import { RolesGuard } from 'src/common/guard/roleGuard';
import { accessRoles } from 'src/common/decorator/roles.decorator';
import { CurrentUser } from 'src/common/decorator/currentUser.decorator';
import { Roles } from 'src/common/enum/roles.enum';
import { Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('applications')
@ApiBearerAuth('bearer')
@Controller('applications')
@UseGuards(AuthGuard, RolesGuard)
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  @Post()
  @accessRoles(Roles.CANDIDATE)
  apply(@CurrentUser() user: any, @Body() dto: CreateApplicationDto) {
    return this.applicationService.apply(user, dto);
  }

  @Get('me')
  @accessRoles(Roles.CANDIDATE)
  my(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.applicationService.myApplications(user, {
      skip: Number(page || 1),
      take: Number(limit || 10),
    });
  }

  @Get('employer')
  @accessRoles(Roles.EMPLOYER)
  employer(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.applicationService.employerApplications(user, {
      skip: Number(page || 1),
      take: Number(limit || 10),
    });
  }

  @Patch(':id/status')
  @accessRoles(Roles.EMPLOYER, Roles.ADMIN, Roles.SUPER_ADMIN)
  updateStatus(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    return this.applicationService.updateApplicationStatus(user, id, dto);
  }
}
