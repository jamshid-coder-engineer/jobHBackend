import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { successRes } from 'src/infrastructure/response/success.response';
import type { ISuccess } from 'src/infrastructure/pagination/successResponse';

import { Company } from 'src/core/entity/company.entity';
import { CreateCompanyDto } from './dto/com.create.dto';
import { UpdateCompanyDto } from './dto/com.update.dto';
import { CompanyStatus, VacancyStatus } from 'src/common/enum/roles.enum';

@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(Company) private readonly companyRepo: Repository<Company>,
  ) { }

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


    Object.assign(company, dto);
    const saved = await this.companyRepo.save(company);
    return successRes(saved);
  }

  async updateMyLogo(currentUser: { id: string }, filename: string): Promise<ISuccess> {
    const company = await this.companyRepo.findOne({ where: { ownerId: currentUser.id } as any });
    if (!company) throw new NotFoundException('Company not found');

    company.logo = filename;
    

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

  async getOnePublic(id: string): Promise<ISuccess> {
    const company = await this.companyRepo.findOne({
      where: { id } as any,
      relations: ['vacancies'],
    });

    if (!company) throw new NotFoundException('Kompaniya topilmadi');

    if (company.vacancies) {
      company.vacancies = company.vacancies.filter(
        (v: any) => v.status === VacancyStatus.PUBLISHED && !v.isDeleted
      );
    }

    return successRes(company);
  }

  async adminVerify(companyId: string, value: boolean): Promise<ISuccess> {
    const company = await this.companyRepo.findOne({ where: { id: companyId } as any });
    if (!company) throw new NotFoundException('Company not found');

    company.isVerified = value;
    company.verifiedAt = value ? new Date() : null;

    const saved = await this.companyRepo.save(company);
    return successRes(saved);
  }

  private async checkInnFromApi(inn: string) {
    const mockData: any = {
      '300000001': {
        name: "UCELL (COSCOM MCHJ)",
        address: "Toshkent sh., Mirobod tumani",
        director: "Vladimir Kravchenko",
        activity: "Telekommunikatsiya",
        status: 'ACTIVE',
        isLegal: true
      },
      '300000002': {
        name: "AKFA GROUP",
        address: "Toshkent sh., Shayxontohur",
        director: "Abduvohidov A.",
        activity: "Ishlab chiqarish",
        status: 'ACTIVE',
        isLegal: true
      },
      '300000003': {
        name: "CLICK MCHJ",
        address: "Toshkent sh., Yunusobod",
        director: "Rupov Ulugbek",
        activity: "Fintech & IT",
        status: 'ACTIVE',
        isLegal: true
      },
      '300000004': {
        name: "PAYME (INSPIRED)",
        address: "Toshkent sh., Yakkasaroy",
        director: "Abdulazizov A.",
        activity: "To'lov tizimi",
        status: 'ACTIVE',
        isLegal: true
      },
      '300000005': {
        name: "KORZINKA (ANGELS FOOD)",
        address: "Toshkent sh., Sergeli",
        director: "Zafar Hoshimov",
        activity: "Retail",
        status: 'ACTIVE',
        isLegal: true
      }
    };

    if (mockData[inn]) {
      return mockData[inn];
    }

    throw new Error("Bunday INN davlat reyestridan topilmadi");
  }

  async createCompanyByInn(user: any, inn: string): Promise<ISuccess> {
    const existing = await this.companyRepo.findOne({ where: { inn } as any });
    if (existing) throw new BadRequestException("Bu kompaniya allaqachon tizimda bor!");

    const apiData = await this.checkInnFromApi(inn);

    if (apiData.status === 'LIQUIDATED' || !apiData.isLegal) {
      throw new BadRequestException("Bu korxona faoliyatini to'xtatgan (Tugatilgan)!");
    }

    const newCompany = this.companyRepo.create({
      name: apiData.name,
      description: `Direktor: ${apiData.director}`,
      location: apiData.address,
      inn: inn,
      ownerId: user.id,
      status: CompanyStatus.APPROVED,
      isVerified: true,
    });

    const saved = await this.companyRepo.save(newCompany);
    return successRes(saved, 201);
  }
}