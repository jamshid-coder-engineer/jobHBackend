import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Company } from 'src/core/entity/company.entity';
import { User } from 'src/core/entity/user.entity';
import { Roles } from 'src/common/enum/roles.enum';

import { CreateCompanyDto } from './dto/com.create.dto';
import { UpdateCompanyDto } from './dto/com.update.dto';

@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(Company) private readonly companyRepo: Repository<Company>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async create(currentUser: { id: string; role: Roles }, dto: CreateCompanyDto) {
    if (currentUser.role !== Roles.TEACHER) {
      throw new ForbiddenException('Only employer can create company');
    }

    const owner = await this.userRepo.findOne({ where: { id: currentUser.id, isDeleted: false } });
    if (!owner) throw new NotFoundException('User not found');

    const exists = await this.companyRepo.findOne({
      where: { owner: { id: owner.id } } as any,
    });
    if (exists) throw new ConflictException('Company already exists for this user');

    const company = this.companyRepo.create({
      owner,
      name: dto.name,
      description: dto.description ?? null,
      website: dto.website ?? null,
      location: dto.location ?? null,
      isActive: true,
    });

    return this.companyRepo.save(company);
  }

  async getMyCompany(currentUser: { id: string }) {
    const company = await this.companyRepo.findOne({
      where: { owner: { id: currentUser.id } } as any,
    });

    if (!company) throw new NotFoundException('Company not found');

    return company;
  }

  async update(
    currentUser: { id: string; role: Roles },
    companyId: string,
    dto: UpdateCompanyDto,
  ) {
    const company = await this.companyRepo.findOne({
      where: { id: companyId } as any,
      relations: ['owner'],
    });

    if (!company) throw new NotFoundException('Company not found');

    const isOwner = company.owner?.id === currentUser.id;
    const isAdmin = currentUser.role === Roles.ADMIN || currentUser.role === Roles.SUPER_ADMIN;

    if (!isOwner && !isAdmin) throw new ForbiddenException();

    await this.companyRepo.update(companyId as any, dto as any);

    return this.companyRepo.findOne({ where: { id: companyId } as any });
  }

  async toggleStatus(currentUser: { role: Roles }, companyId: string) {
    const isAdmin = currentUser.role === Roles.ADMIN || currentUser.role === Roles.SUPER_ADMIN;
    if (!isAdmin) throw new ForbiddenException();

    const company = await this.companyRepo.findOne({ where: { id: companyId } as any });
    if (!company) throw new NotFoundException('Company not found');

    company.isActive = !company.isActive;
    return this.companyRepo.save(company);
  }
}
