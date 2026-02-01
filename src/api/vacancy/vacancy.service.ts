import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike } from 'typeorm';

import { Vacancy } from 'src/core/entity/vacancy.entity';
import { Company } from 'src/core/entity/company.entity';

import { Roles } from 'src/common/enum/roles.enum';

import { BaseService } from 'src/infrastructure/base/base.service';
import { successRes } from 'src/infrastructure/response/success.response';
import {
  IResponsePagination,
  ISuccess,
} from 'src/infrastructure/pagination/successResponse';
import { RepositoryPager } from 'src/infrastructure/pagination/RepositoryPager';

import { CreateVacancyDto } from './dto/create-vacancy.dto';
import { UpdateVacancyDto } from './dto/update-vacancy.dto';
import { VacancyQueryDto } from './dto/vacancy-query.dto';

@Injectable()
export class VacancyService extends BaseService<
  CreateVacancyDto,
  UpdateVacancyDto,
  Vacancy
> {
  constructor(
    @InjectRepository(Vacancy) private readonly vacancyRepo: any,
    @InjectRepository(Company) private readonly companyRepo: any,
  ) {
    super(vacancyRepo);
  }

  async findOneVacancy(id: string): Promise<ISuccess> {
    const vacancy = await this.vacancyRepo.findOne({
      where: { id, isDeleted: false } as any,
      relations: ['company'],
    });

    if (!vacancy) throw new NotFoundException('Vacancy not found');

    if (!vacancy.isActive) throw new NotFoundException('Vacancy not found');

    return successRes(vacancy);
  }

  async listPublic(query: VacancyQueryDto): Promise<IResponsePagination> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where: any = { isActive: true, isDeleted: false };
    if (query.q) where.title = ILike(`%${query.q}%`);
    if (query.city) where.city = ILike(`%${query.city}%`);
    if (query.employmentType) where.employmentType = query.employmentType;

    return RepositoryPager.findAll(this.vacancyRepo, {
      where,
      take: limit,
      skip: page, // RepositoryPager.skip = page (1-based) deb ishlaydi
      order: { createdAt: 'DESC' },
    });
  }

  // EMPLOYER list (o‘zimniki)
  async listEmployer(
    currentUser: { id: string; role: Roles },
    query: VacancyQueryDto,
  ): Promise<IResponsePagination> {
    if (currentUser.role !== Roles.EMPLOYER) throw new ForbiddenException();

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where: any = {
      isDeleted: false,
      company: { owner: { id: currentUser.id } },
    };

    if (query.q) where.title = ILike(`%${query.q}%`);
    if (query.city) where.city = ILike(`%${query.city}%`);
    if (query.employmentType) where.employmentType = query.employmentType;

    return RepositoryPager.findAll(this.vacancyRepo, {
      where,
      take: limit,
      skip: page,
      order: { createdAt: 'DESC' },
    });
  }

  // EMPLOYER create
  async createVacancy(
    currentUser: { id: string; role: Roles },
    dto: CreateVacancyDto,
  ): Promise<ISuccess> {
    if (currentUser.role !== Roles.EMPLOYER) {
      throw new ForbiddenException('Only employer can create vacancy');
    }

    const company = await this.companyRepo.findOne({
      where: { owner: { id: currentUser.id } },
    });
    if (!company) throw new NotFoundException('Company profile not found');

    const vacancy = this.vacancyRepo.create({
      company,
      title: dto.title,
      description: dto.description,
      city: dto.city ?? null,
      salaryFrom: dto.salaryFrom ?? null,
      salaryTo: dto.salaryTo ?? null,
      employmentType: dto.employmentType,
      isActive: true,
    });

    const saved = await this.vacancyRepo.save(vacancy);
    return successRes(saved, 201);
  }

  // OWNER/ADMIN update (status va fieldlar)
  async updateVacancy(
    currentUser: { id: string; role: Roles },
    id: string,
    dto: UpdateVacancyDto,
  ): Promise<ISuccess> {
    const vacancy = await this.vacancyRepo.findOne({ where: { id } });
    if (!vacancy) throw new NotFoundException('Vacancy not found');

    const isAdmin = [Roles.ADMIN, Roles.SUPER_ADMIN].includes(currentUser.role);
    const isOwner =
      currentUser.role === Roles.EMPLOYER &&
      vacancy.company?.owner?.id === currentUser.id;

    if (!isAdmin && !isOwner) throw new ForbiddenException();

    await this.vacancyRepo.update(id, dto);
    const updated = await this.vacancyRepo.findOne({ where: { id } });

    return successRes(updated);
  }

  async toggleVacancyStatus(
    currentUser: { id: string; role: Roles },
    vacancyId: string,
  ) {
    if (![Roles.ADMIN, Roles.SUPER_ADMIN].includes(currentUser.role)) {
      throw new ForbiddenException();
    }
    return super.updateStatus(vacancyId);
  }

  async listAdmin(
    currentUser: { id: string; role: Roles },
    page = 1,
    limit = 10,
  ) {
    if (![Roles.ADMIN, Roles.SUPER_ADMIN].includes(currentUser.role)) {
      throw new ForbiddenException();
    }

    return RepositoryPager.findAll(this.vacancyRepo, {
      where: { isDeleted: false } as any,
      skip: page,
      take: limit,
      order: { createdAt: 'DESC' as any },
    });
  }
}
