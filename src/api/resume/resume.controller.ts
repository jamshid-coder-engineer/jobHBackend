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

import { ApiBody, ApiConsumes, ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('resumes')
@ApiBearerAuth('bearer')
@Controller('resumes')
@UseGuards(AuthGuard, RolesGuard)
export class ResumeController {
  constructor(private readonly resumeService: ResumeService) {}

  @ApiBearerAuth()
  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @accessRoles(Roles.CANDIDATE)
  create(@CurrentUser() user: any, @Body() dto: CreateResumeDto) {
    return this.resumeService.createResume(user, dto);
  }

  @ApiBearerAuth()
  @Get('me')
  @UseGuards(AuthGuard, RolesGuard)
  @accessRoles(Roles.CANDIDATE)
  me(@CurrentUser() user: any) {
    return this.resumeService.myResume(user);
  }

  @ApiBearerAuth('bearer')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Resume CV PDF file',
        },
      },
    },
  })
  @Patch('me/cv')
  @UseGuards(AuthGuard, RolesGuard)
  @accessRoles(Roles.CANDIDATE)
  @UseInterceptors(FileInterceptor('file', pdfMulterOptions))
  uploadCv(@CurrentUser() user: any, @UploadedFile() file: any) {
    return this.resumeService.updateMyCv(user, file.filename);
  }

  @ApiBearerAuth()
  @Patch('me')
  @UseGuards(AuthGuard, RolesGuard)
  @accessRoles(Roles.CANDIDATE)
  updateMe(@CurrentUser() user: any, @Body() dto: UpdateResumeDto) {
    return this.resumeService.updateMyResume(user, dto);
  }
}
