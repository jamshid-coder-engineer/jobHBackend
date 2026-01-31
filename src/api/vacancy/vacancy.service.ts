import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';

import { Vacancy } from 'src/core/entity/vacancy.entity';
import { Company } from 'src/core/entity/company.entity';
import { Roles } from 'src/common/enum/roles.enum';

import { CreateVacancyDto } from './dto/create-vacancy.dto';
import { UpdateVacancyDto } from './dto/update-vacancy.dto';
import { VacancyQueryDto } from './dto/vacancy-query.dto';

@Injectable()
export class VacancyService {
  constructor(
    @InjectRepository(Vacancy) private readonly vacancyRepo: Repository<Vacancy>,
    @InjectRepository(Company) private readonly companyRepo: Repository<Company>,
  ) {}

  async create(currentUser: { id: string; role: Roles }, dto: CreateVacancyDto) {
    if (currentUser.role !== Roles.TEACHER) {
      throw new ForbiddenException('Only employer can create vacancy');
    }

    const company = await this.companyRepo.findOne({
      where: { owner: { id: currentUser.id } } as any,
    });
    if (!company) throw new NotFoundException('Company profile not found');

    const vacancy = this.vacancyRepo.create({
      company,
      title: dto.title,
      description: dto.description,
      city: dto.city ?? null,
      salaryFrom: dto.salaryFrom ?? null,
      salaryTo: dto.salaryTo ?? null,
      employmentType: dto.employmentType ?? undefined,
      isActive: true,
    });

    return this.vacancyRepo.save(vacancy);
  }

  async update(
    currentUser: { id: string; role: Roles },
    id: string,
    dto: UpdateVacancyDto,
  ) {
    const vacancy = await this.vacancyRepo.findOne({ where: { id } as any });
    if (!vacancy) throw new NotFoundException('Vacancy not found');

    const isAdmin = [Roles.ADMIN, Roles.SUPER_ADMIN].includes(currentUser.role);
    const isOwner =
      currentUser.role === Roles.TEACHER &&
      vacancy.company?.owner?.id === currentUser.id;

    if (!isAdmin && !isOwner) throw new ForbiddenException();

    await this.vacancyRepo.update(id as any, dto as any);
    return this.vacancyRepo.findOne({ where: { id } as any });
  }

  async findOne(id: string) {
    const vacancy = await this.vacancyRepo.findOne({ where: { id } as any });
    if (!vacancy) throw new NotFoundException('Vacancy not found');
    return vacancy;
  }

  async listPublic(query: VacancyQueryDto) {
    const page = Math.max(Number(query.page || 1), 1);
    const limit = Math.min(Math.max(Number(query.limit || 10), 1), 50);
    const skip = (page - 1) * limit;

    const where: any = { isActive: true };

    if (query.q) where.title = ILike(`%${query.q}%`);
    if (query.city) where.city = ILike(`%${query.city}%`);
    if (query.employmentType) where.employmentType = query.employmentType;

    const [data, total] = await this.vacancyRepo.findAndCount({
      where,
      take: limit,
      skip,
      order: { createdAt: 'DESC' as any },
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
      },
    };
  }
}
