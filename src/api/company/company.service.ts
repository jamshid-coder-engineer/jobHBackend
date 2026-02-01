import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { successRes } from 'src/infrastructure/response/success.response';
import type { ISuccess } from 'src/infrastructure/pagination/successResponse';

import { Company } from 'src/core/entity/company.entity';
import { CreateCompanyDto } from './dto/com.create.dto';
import { UpdateCompanyDto } from './dto/com.update.dto';
import { CompanyStatus } from 'src/common/enum/roles.enum';

@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(Company) private readonly companyRepo: Repository<Company>,
  ) {}

  async createMyCompany(currentUser: { id: string; role: any }, dto: CreateCompanyDto): Promise<ISuccess> {
    const exists = await this.companyRepo.findOne({ where: { ownerId: currentUser.id } as any });
    if (exists) return successRes(exists);

    const company = this.companyRepo.create({
      ...dto,
      ownerId: currentUser.id,
      status: CompanyStatus.PENDING,
      isVerified: false,
    });

    const saved = await this.companyRepo.save(company);
    return successRes(saved, 201);
  }

  async getMyCompany(currentUser: { id: string }): Promise<ISuccess> {
    const company = await this.companyRepo.findOne({ where: { ownerId: currentUser.id } as any });
    if (!company) throw new NotFoundException('Company not found');
    return successRes(company);
  }

  async updateMyCompany(currentUser: { id: string }, dto: UpdateCompanyDto): Promise<ISuccess> {
    const company = await this.companyRepo.findOne({ where: { ownerId: currentUser.id } as any });
    if (!company) throw new NotFoundException('Company not found');

    company.status = CompanyStatus.PENDING;
    company.rejectedReason = null;
    company.approvedAt = null;

    Object.assign(company, dto);
    const saved = await this.companyRepo.save(company);
    return successRes(saved);
  }

  async updateMyLogo(currentUser: { id: string }, filename: string): Promise<ISuccess> {
    const company = await this.companyRepo.findOne({ where: { ownerId: currentUser.id } as any });
    if (!company) throw new NotFoundException('Company not found');

    company.logo = `${filename}`;
    company.status = CompanyStatus.PENDING;
    company.rejectedReason = null;
    company.approvedAt = null;

    const saved = await this.companyRepo.save(company);
    return successRes(saved);
  }

  async adminList(status?: CompanyStatus): Promise<ISuccess> {
    const where: any = {};
    if (status) where.status = status;

    const data = await this.companyRepo.find({
      where,
      order: { createdAt: 'DESC' as any },
    });

    return successRes(data);
  }

  async adminApprove(companyId: string): Promise<ISuccess> {
    const company = await this.companyRepo.findOne({ where: { id: companyId } as any });
    if (!company) throw new NotFoundException('Company not found');

    company.status = CompanyStatus.APPROVED;
    company.approvedAt = new Date();
    company.rejectedReason = null;

    const saved = await this.companyRepo.save(company);
    return successRes(saved);
  }

  async adminReject(companyId: string, reason?: string): Promise<ISuccess> {
    const company = await this.companyRepo.findOne({ where: { id: companyId } as any });
    if (!company) throw new NotFoundException('Company not found');

    company.status = CompanyStatus.REJECTED;
    company.rejectedReason = reason ?? 'Rejected by admin';
    company.approvedAt = null;

    const saved = await this.companyRepo.save(company);
    return successRes(saved);
  }

  async adminVerify(companyId: string, value: boolean): Promise<ISuccess> {
    const company = await this.companyRepo.findOne({ where: { id: companyId } as any });
    if (!company) throw new NotFoundException('Company not found');

    company.isVerified = value;
    company.verifiedAt = value ? new Date() : null;

    const saved = await this.companyRepo.save(company);
    return successRes(saved);
  }
}
