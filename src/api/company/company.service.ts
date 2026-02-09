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
  ) {}

  // 1. ODDIY KOMPANIYA YARATISH (Eski metod)
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

  // 2. FOYDALANUVCHI KOMPANIYASINI OLISH
  async getMyCompany(currentUser: { id: string }): Promise<ISuccess> {
    const company = await this.companyRepo.findOne({ where: { ownerId: currentUser.id } as any });
    if (!company) throw new NotFoundException('Company not found');
    return successRes(company);
  }

  // 3. KOMPANIYANI YANGILASH
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

  // 4. LOGO YANGILASH
  async updateMyLogo(currentUser: { id: string }, filename: string): Promise<ISuccess> {
    const company = await this.companyRepo.findOne({ where: { ownerId: currentUser.id } as any });
    if (!company) throw new NotFoundException('Company not found');

    company.logo = filename;
    company.status = CompanyStatus.PENDING;
    company.rejectedReason = null;
    company.approvedAt = null;

    const saved = await this.companyRepo.save(company);
    return successRes(saved);
  }

  // 5. ADMIN: BARCHA KOMPANIYALAR
  async adminList(status?: CompanyStatus): Promise<ISuccess> {
    const where: any = {};
    if (status) where.status = status;

    const data = await this.companyRepo.find({
      where,
      order: { createdAt: 'DESC' as any },
    });

    return successRes(data);
  }

  // 6. ADMIN: TASDIQLASH
  async adminApprove(companyId: string): Promise<ISuccess> {
    const company = await this.companyRepo.findOne({ where: { id: companyId } as any });
    if (!company) throw new NotFoundException('Company not found');

    company.status = CompanyStatus.APPROVED;
    company.approvedAt = new Date();
    company.rejectedReason = null;

    const saved = await this.companyRepo.save(company);
    return successRes(saved);
  }

  // 7. ADMIN: RAD ETISH
  async adminReject(companyId: string, reason?: string): Promise<ISuccess> {
    const company = await this.companyRepo.findOne({ where: { id: companyId } as any });
    if (!company) throw new NotFoundException('Company not found');

    company.status = CompanyStatus.REJECTED;
    company.rejectedReason = reason ?? 'Rejected by admin';
    company.approvedAt = null;

    const saved = await this.companyRepo.save(company);
    return successRes(saved);
  }

  // 8. PUBLIC: KOMPANIYANI KO'RISH
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

  // 9. ADMIN: VERIFIKATSIYA
  async adminVerify(companyId: string, value: boolean): Promise<ISuccess> {
    const company = await this.companyRepo.findOne({ where: { id: companyId } as any });
    if (!company) throw new NotFoundException('Company not found');

    company.isVerified = value;
    company.verifiedAt = value ? new Date() : null;

    const saved = await this.companyRepo.save(company);
    return successRes(saved);
  }

  // 👇 ==========================================
  // 👇 YANGI QO'SHILGAN FAKE INN LOGIKASI
  // 👇 ==========================================

  // A) SOXTA API (MOCK)
  async checkInnFromApi(inn: string): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5 sek kutish

    switch (inn) {
      case '300000001':
        return {
          name: "COSCOM MChJ (UCELL)",
          director: "LUTFULLAYEV A.A.",
          address: "Toshkent sh., Shahrisabz ko'chasi, 1-uy",
          status: "ACTIVE",
          isLegal: true
        };
      
      case '300000002':
        return {
          name: "AKFA BUILDINGS MChJ",
          director: "ABDUVAHITEV J.",
          address: "Toshkent sh., Shayxontohur tumani",
          status: "ACTIVE",
          isLegal: true
        };

      case '999999999':
        return {
          name: "ESKI ZAVOD DUK",
          status: "LIQUIDATED",
          isLegal: false
        };

      default:
        throw new NotFoundException("Bunday STIR (INN) raqamli korxona topilmadi yoki ro'yxatdan o'tmagan.");
    }
  }

  // B) INN ORQALI KOMPANIYA YARATISH (ASOSIY)
  async createCompanyByInn(user: any, inn: string): Promise<ISuccess> {
    // 1. Bazada borligini tekshiramiz
    const existing = await this.companyRepo.findOne({ where: { inn } as any });
    if (existing) throw new BadRequestException("Bu kompaniya allaqachon tizimda bor!");

    // 2. Tashqi API dan tekshiramiz
    const apiData = await this.checkInnFromApi(inn);

    // 3. Status tekshiruvi
    if (apiData.status === 'LIQUIDATED' || !apiData.isLegal) {
       throw new BadRequestException("Bu korxona faoliyatini to'xtatgan (Tugatilgan)!");
    }

    // 4. Bazaga saqlash
    const newCompany = this.companyRepo.create({
      name: apiData.name,
      description: `Direktor: ${apiData.director}`,
      location: apiData.address,
      inn: inn,
      ownerId: user.id,
      status: CompanyStatus.APPROVED, // Avtomatik tasdiqlash
      isVerified: true,
    });

    const saved = await this.companyRepo.save(newCompany);
    // 5. Javobni ISuccess formatida qaytarish
    return successRes(saved, 201);
  }
}