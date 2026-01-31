import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';

import { ResumeService } from './resume.service';
import { CreateResumeDto } from './dto/create-resume.dto';
import { UpdateResumeDto } from './dto/update-resume.dto';

import { AuthGuard } from 'src/common/guard/authGuard';
import { RolesGuard } from 'src/common/guard/roleGuard';
import { accessRoles } from 'src/common/decorator/roles.decorator';
import { CurrentUser } from 'src/common/decorator/currentUser.decorator';
import { Roles } from 'src/common/enum/roles.enum';

import { FileInterceptor } from '@nestjs/platform-express';
import { UploadedFile, UseInterceptors } from '@nestjs/common';
import { pdfMulterOptions } from '../../infrastructure/fileServise/multer-pdf';

import { ApiBody, ApiConsumes, ApiBearerAuth } from '@nestjs/swagger';


@Controller('resumes')
@UseGuards(AuthGuard, RolesGuard)
export class ResumeController {
  constructor(private readonly resumeService: ResumeService) { }

  @ApiBearerAuth()
  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @accessRoles(Roles.STUDENT)
  create(@CurrentUser() user: any, @Body() dto: CreateResumeDto) {
    return this.resumeService.createResume(user, dto);
  }

  @ApiBearerAuth()
  @Get('me')
  @UseGuards(AuthGuard, RolesGuard)
  @accessRoles(Roles.STUDENT)
  me(@CurrentUser() user: any) {
    return this.resumeService.myResume(user);
  }

  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })

  @ApiBearerAuth()
  @Patch('me/cv')
  @UseGuards(AuthGuard, RolesGuard)
  @accessRoles(Roles.STUDENT)
  @UseInterceptors(FileInterceptor('file', pdfMulterOptions))
  uploadCv(@CurrentUser() user: any, @UploadedFile() file: any) {
    return this.resumeService.updateMyCv(user, file.filename);
  }


  @ApiBearerAuth()
  @Patch('me')
  @UseGuards(AuthGuard, RolesGuard)
  @accessRoles(Roles.STUDENT)
  updateMe(@CurrentUser() user: any, @Body() dto: UpdateResumeDto) {
    return this.resumeService.updateMyResume(user, dto);
  }

}
