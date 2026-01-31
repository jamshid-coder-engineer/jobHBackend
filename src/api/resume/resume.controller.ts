import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';

import { ResumeService } from './resume.service';
import { CreateResumeDto } from './dto/create-resume.dto';
import { UpdateResumeDto } from './dto/update-resume.dto';

import { AuthGuard } from 'src/common/guard/authGuard';
import { RolesGuard } from 'src/common/guard/roleGuard';
import { accessRoles } from 'src/common/decorator/roles.decorator';
import { CurrentUser } from 'src/common/decorator/currentUser.decorator';
import { Roles } from 'src/common/enum/roles.enum';

@Controller('resumes')
@UseGuards(AuthGuard, RolesGuard)
export class ResumeController {
  constructor(private readonly resumeService: ResumeService) {}

  @Post()
  @accessRoles(Roles.STUDENT)
  create(@CurrentUser() user: any, @Body() dto: CreateResumeDto) {
    return this.resumeService.create(user, dto);
  }

  @Get('me')
  @accessRoles(Roles.STUDENT, Roles.ADMIN, Roles.SUPER_ADMIN)
  myResume(@CurrentUser() user: any) {
    return this.resumeService.getMyResume(user);
  }

  @Patch(':id')
  @accessRoles(Roles.STUDENT, Roles.ADMIN, Roles.SUPER_ADMIN)
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateResumeDto) {
    return this.resumeService.update(user, id, dto);
  }
}
