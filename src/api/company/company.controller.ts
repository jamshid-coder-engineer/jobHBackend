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

import { CompanyService } from './company.service';
import { CreateCompanyDto } from './dto/com.create.dto';
import { UpdateCompanyDto } from './dto/com.update.dto';

import { AuthGuard } from 'src/common/guard/authGuard';
import { RolesGuard } from 'src/common/guard/roleGuard';
import { accessRoles } from 'src/common/decorator/roles.decorator';
import { CurrentUser } from 'src/common/decorator/currentUser.decorator';
import { Roles } from 'src/common/enum/roles.enum';

import { FileInterceptor } from '@nestjs/platform-express';
import { UploadedFile, UseInterceptors } from '@nestjs/common';
import { multerOptions } from '../../infrastructure/fileServise/multer.utils';

import { ApiBody, ApiConsumes, ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('companies')
@ApiBearerAuth('bearer')
@Controller('companies')
@UseGuards(AuthGuard, RolesGuard)
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @ApiBearerAuth()
  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @accessRoles(Roles.EMPLOYER)
  create(@CurrentUser() user: any, @Body() dto: CreateCompanyDto) {
    return this.companyService.createCompany(user, dto);
  }

  @ApiBearerAuth()
  @Get('me')
  @UseGuards(AuthGuard, RolesGuard)
  @accessRoles(Roles.EMPLOYER)
  me(@CurrentUser() user: any) {
    return this.companyService.myCompany(user);
  }

  @ApiBearerAuth()
  @Patch('me')
  @UseGuards(AuthGuard, RolesGuard)
  @accessRoles(Roles.EMPLOYER)
  updateMe(@CurrentUser() user: any, @Body() dto: UpdateCompanyDto) {
    return this.companyService.updateMyCompany(user, dto);
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
          description: 'Company logo image',
        },
      },
    },
  })
  @Patch('me/logo')
  @UseGuards(AuthGuard, RolesGuard)
  @accessRoles(Roles.EMPLOYER)
  @UseInterceptors(FileInterceptor('file', multerOptions))
  uploadLogo(@CurrentUser() user: any, @UploadedFile() file: any) {
    return this.companyService.updateMyLogo(user, file.filename);
  }

  @ApiBearerAuth()
  @Patch(':id/status')
  @UseGuards(AuthGuard, RolesGuard)
  @accessRoles(Roles.ADMIN, Roles.SUPER_ADMIN)
  toggleStatus(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.companyService.toggleCompanyStatus(user, id);
  }
}
