import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';

import { Company } from 'src/core/entity/company.entity';
import { User } from 'src/core/entity/user.entity';

import { Roles } from 'src/common/enum/roles.enum';

import { BaseService } from 'src/infrastructure/base/base.service';
import { successRes } from 'src/infrastructure/response/success.response';
import { RepositoryPager } from 'src/infrastructure/pagination/RepositoryPager';
import {
  IFindOptions,
  IResponsePagination,
  ISuccess,
} from 'src/infrastructure/pagination/successResponse';

import { CreateCompanyDto } from './dto/com.create.dto';
import { UpdateCompanyDto } from './dto/com.update.dto';

import { removeUploadFileSafe } from '../../infrastructure/fileServise/file-remove';
import { config } from 'src/config';

@Injectable()
export class CompanyService extends BaseService<
  CreateCompanyDto,
  UpdateCompanyDto,
  Company
> {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {
    super(companyRepo);
  }

  async createCompany(
    currentUser: { id: string; role: Roles },
    dto: CreateCompanyDto,
  ): Promise<ISuccess> {
    if (currentUser.role !== Roles.EMPLOYER) {
      throw new ForbiddenException('Only employer can create company');
    }

    const owner = await this.userRepo.findOne({
      where: { id: currentUser.id, isDeleted: false } as any,
    });
    if (!owner) throw new NotFoundException('User not found');

    const exists = await this.companyRepo.findOne({
      where: { owner: { id: owner.id }, isDeleted: false } as any,
    });
    if (exists)
      throw new ConflictException('Company already exists for this user');

    const company = this.companyRepo.create({
      ...dto,
      owner,
      isActive: true,
    } as any);

    const saved = await this.companyRepo.save(company);
    return successRes(saved, 201);
  }

  async myCompany(currentUser: { id: string; role: Roles }): Promise<ISuccess> {
    if (currentUser.role !== Roles.EMPLOYER) throw new ForbiddenException();

    const company = await this.companyRepo.findOne({
      where: { owner: { id: currentUser.id }, isDeleted: false } as any,
    });

    if (!company) throw new NotFoundException('Company not found');
    return successRes(company);
  }

  async updateMyCompany(
    currentUser: { id: string; role: Roles },
    dto: UpdateCompanyDto,
  ): Promise<ISuccess> {
    if (currentUser.role !== Roles.EMPLOYER) throw new ForbiddenException();

    const company = await this.companyRepo.findOne({
      where: { owner: { id: currentUser.id }, isDeleted: false } as any,
    });
    if (!company) throw new NotFoundException('Company not found');

    await this.companyRepo.update(company.id as any, dto as any);

    const updated = await this.companyRepo.findOne({
      where: { id: company.id } as any,
    });

    return successRes(updated);
  }

  async updateMyLogo(
    currentUser: { id: string; role: Roles },
    filename: string,
  ) {
    if (currentUser.role !== Roles.EMPLOYER) throw new ForbiddenException();

    const company = await this.companyRepo.findOne({
      where: { owner: { id: currentUser.id }, isDeleted: false } as any,
    });
    if (!company) throw new NotFoundException('Company not found');

    await removeUploadFileSafe(company.logo);

    company.logo = `${config.UPLOAD.FOLDER}/${filename}`;
    const saved = await this.companyRepo.save(company);

    return successRes(saved);
  }

  // PUBLIC -> company list (pagination) (frontend uchun foydali)
  async listPublic(
    options?: IFindOptions<Company>,
  ): Promise<IResponsePagination> {
    return RepositoryPager.findAll(this.companyRepo, {
      ...(options || {}),
      where: {
        isDeleted: false,
        isActive: true,
        ...(options?.where || {}),
      } as any,
      order: options?.order || ({ createdAt: 'DESC' } as any),
    });
  }

  // PUBLIC -> company search (name/city) (ixtiyoriy helper)
  async searchPublic(
    q?: string,
    city?: string,
    page = 1,
    limit = 10,
  ): Promise<IResponsePagination> {
    const where: any = { isDeleted: false, isActive: true };
    if (q) where.name = ILike(`%${q}%`);
    if (city) where.city = ILike(`%${city}%`);

    return RepositoryPager.findAll(this.companyRepo, {
      where,
      skip: page,
      take: limit,
      order: { createdAt: 'DESC' },
    });
  }

  async toggleCompanyStatus(
    currentUser: { id: string; role: Roles },
    companyId: string,
  ) {
    if (![Roles.ADMIN, Roles.SUPER_ADMIN].includes(currentUser.role)) {
      throw new ForbiddenException();
    }
    return super.updateStatus(companyId);
  }

  async listAdmin(
    currentUser: { id: string; role: Roles },
    page = 1,
    limit = 10,
  ) {
    if (![Roles.ADMIN, Roles.SUPER_ADMIN].includes(currentUser.role)) {
      throw new ForbiddenException();
    }

    return RepositoryPager.findAll(this.companyRepo, {
      where: { isDeleted: false } as any,
      skip: page,
      take: limit,
      order: { createdAt: 'DESC' as any },
    });
  }
}
