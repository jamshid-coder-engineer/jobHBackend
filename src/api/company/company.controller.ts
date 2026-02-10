import { Body, Controller, Get, Patch, Post, UseGuards, UploadedFile, UseInterceptors, Param, Req, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiBody, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';

import { CompanyService } from './company.service';
import { CreateCompanyDto } from './dto/com.create.dto';
import { UpdateCompanyDto } from './dto/com.update.dto';

import { AuthGuard } from 'src/common/guard/authGuard';
import { RolesGuard } from 'src/common/guard/roleGuard';
import { accessRoles } from 'src/common/decorator/roles.decorator';
import { CurrentUser } from 'src/common/decorator/currentUser.decorator';
import { Roles } from 'src/common/enum/roles.enum';
import { multerOptions } from 'src/infrastructure/fileServise/multer.utils';

@ApiTags('Company')
@Controller('companies')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @ApiBearerAuth('bearer')
  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: any) {
    return this.companyService.getMyCompany(user);
  }

  @UseGuards(AuthGuard)
  @Post('create-by-inn')
  async createByInn(@Req() req: any, @Body('inn') inn: string) {
    return await this.companyService.createCompanyByInn(req.user, inn);
  }

  @ApiBearerAuth('bearer')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @Post('upload-logo') 
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file', multerOptions))
  uploadLogo(@CurrentUser() user: any, @UploadedFile() file: any) {
    if (!file) throw new BadRequestException('Rasm yuklanmadi');
    return this.companyService.updateMyLogo(user, file.filename);
  }

  @ApiBearerAuth('bearer')
  @Post('me')
  @UseGuards(AuthGuard, RolesGuard)
  @accessRoles(Roles.EMPLOYER) 
  createMe(@CurrentUser() user: any, @Body() dto: CreateCompanyDto) {
    return this.companyService.createMyCompany(user, dto);
  }

  @ApiBearerAuth('bearer')
  @Patch('me')
  @UseGuards(AuthGuard, RolesGuard)
  @accessRoles(Roles.EMPLOYER)
  updateMe(@CurrentUser() user: any, @Body() dto: UpdateCompanyDto) {
    return this.companyService.updateMyCompany(user, dto);
  }

  @Get(':id/public')
  async getOnePublic(@Param('id') id: string) {
    return this.companyService.getOnePublic(id);
  }
}