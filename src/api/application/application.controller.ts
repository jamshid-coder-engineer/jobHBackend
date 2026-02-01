import { Body, Controller, Get, Patch, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from 'src/common/guard/authGuard';
import { RolesGuard } from 'src/common/guard/roleGuard';
import { accessRoles } from 'src/common/decorator/roles.decorator';
import { Roles } from 'src/common/enum/roles.enum';
import { ApplicationService } from './application.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';
import { CurrentUser } from 'src/common/decorator/currentUser.decorator';

@ApiTags('Application')
@ApiBearerAuth('bearer')
@Controller('applications')
@UseGuards(AuthGuard, RolesGuard)
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  @Post()
  @accessRoles(Roles.CANDIDATE)
  @ApiOperation({ summary: 'Vakansiyaga ariza topshirish (Faqat Candidate)' })
  apply(@CurrentUser() user, @Body() dto: CreateApplicationDto) {
    return this.applicationService.apply(user, dto);
  }

  @Get('my')
  @accessRoles(Roles.CANDIDATE)
  @ApiOperation({ summary: 'Topshirgan arizalarim ro‘yxati' })
  getMyApplications(@CurrentUser() user) {
    return this.applicationService.myApplications(user);
  }

  @Get('employer')
  @accessRoles(Roles.EMPLOYER)
  @ApiOperation({ summary: 'Kompaniyamga kelgan arizalar' })
  getEmployerApplications(@CurrentUser() user) {
    return this.applicationService.employerApplications(user);
  }

  @Patch(':id/status')
  @accessRoles(Roles.EMPLOYER, Roles.ADMIN, Roles.SUPER_ADMIN)
  @ApiOperation({ summary: 'Ariza statusini ozgartirish (Review, Accept, Reject)' })
  updateStatus(
    @CurrentUser() user,
    @Param('id') id: string,
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    return this.applicationService.updateApplicationStatus(user, id, dto);
  }
}
