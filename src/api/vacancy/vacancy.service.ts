import { ForbiddenException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { successRes } from 'src/infrastructure/response/success.response';
import type { ISuccess } from 'src/infrastructure/pagination/successResponse';
import { Pager } from 'src/infrastructure/pagination/Pager';

import { Vacancy } from 'src/core/entity/vacancy.entity';
import { VacancyStatus } from 'src/common/enum/roles.enum';
import { Company } from 'src/core/entity/company.entity';
import { CompanyStatus } from 'src/common/enum/roles.enum';
import { CreateVacancyDto } from './dto/create-vacancy.dto';
import { UpdateVacancyDto } from './dto/update-vacancy.dto';
import { VacancyQueryDto } from './dto/vacancy-query.dto';

import { Roles } from 'src/common/enum/roles.enum';
import { BuyPremiumDto } from './dto/buy-premium.dto';

@Injectable()
export class VacancyService {
  constructor(
    @InjectRepository(Vacancy) private readonly vacancyRepo: Repository<Vacancy>,
    @InjectRepository(Company) private readonly companyRepo: Repository<Company>,
  ) {}

  async create(currentUser: { id: string }, dto: CreateVacancyDto): Promise<ISuccess> {
    const company = await this.companyRepo.findOne({
      where: { ownerId: currentUser.id, isDeleted: false } as any,
    });
    
    if (!company) throw new BadRequestException('Avval kompaniya yarating');

    const vacancy = this.vacancyRepo.create({
      ...dto,
      companyId: company.id,
      company: company,
      status: VacancyStatus.DRAFT,
      isActive: true,
    });

    const saved = await this.vacancyRepo.save(vacancy);
    return successRes(saved, 201);
  }

  async update(currentUser: { id: string; role: any }, vacancyId: string, dto: UpdateVacancyDto): Promise<ISuccess> {
    const vacancy = await this.vacancyRepo.findOne({ where: { id: vacancyId } as any });
    if (!vacancy) throw new NotFoundException('Vacancy not found');

    const company = await this.companyRepo.findOne({ where: { id: vacancy.company } as any });
    if (!company) throw new NotFoundException('Company not found');

    if (company.ownerId !== currentUser.id) throw new ForbiddenException('Not your vacancy');

    const shouldRemoderate = vacancy.status === VacancyStatus.PUBLISHED;

    Object.assign(vacancy, dto);

    if (shouldRemoderate) {
      vacancy.status = VacancyStatus.PENDING;
      vacancy.rejectedReason = null;
      vacancy.publishedAt = null;
    }

    const saved = await this.vacancyRepo.save(vacancy);
    return successRes(saved);
  }

  async submitForModeration(currentUser: { id: string }, vacancyId: string): Promise<ISuccess> {
    const vacancy = await this.vacancyRepo.findOne({ 
      where: { id: vacancyId } as any,
      relations: ['company'] 
    });

    if (!vacancy) throw new NotFoundException('Vakansiya topilmadi');
    if (!vacancy.company) throw new BadRequestException('Vakansiyaga boglangan kompaniya topilmadi');

    if (vacancy.company.ownerId !== currentUser.id) {
      throw new ForbiddenException('Bu vakansiya sizga tegishli emas');
    }

    if (vacancy.company.status !== CompanyStatus.APPROVED) {
      throw new BadRequestException('Kompaniyangiz admin tomonidan tasdiqlanishi kerak');
    }

    if (vacancy.status === VacancyStatus.PUBLISHED) {
      return successRes(vacancy, 200);
    }

    vacancy.status = VacancyStatus.PENDING;
    const saved = await this.vacancyRepo.save(vacancy);
    return successRes(saved);
  }

  async adminList(status?: VacancyStatus): Promise<ISuccess> {
    const where: any = { isDeleted: false };
    if (status) where.status = status;

    const data = await this.vacancyRepo.find({
      where,
      relations: ['company'],
      order: { createdAt: 'DESC' },
    });
    return successRes(data);
  }

  async adminApprove(vacancyId: string) {
    const vacancy = await this.vacancyRepo.findOne({ where: { id: vacancyId, isDeleted: false } as any });
    if (!vacancy) throw new NotFoundException('Vacancy not found');

    if (vacancy.status !== VacancyStatus.PENDING) {
      throw new BadRequestException('Only PENDING vacancies can be approved');
    }

    vacancy.status = VacancyStatus.PUBLISHED;
    vacancy.publishedAt = new Date();
    vacancy.rejectedReason = null;

    return successRes(await this.vacancyRepo.save(vacancy));
  }

  async adminReject(vacancyId: string, reason: string) {
    const vacancy = await this.vacancyRepo.findOne({ where: { id: vacancyId, isDeleted: false } as any });
    if (!vacancy) throw new NotFoundException('Vacancy not found');

    vacancy.status = VacancyStatus.REJECTED;
    vacancy.rejectedReason = reason || 'Requirements not met';
    vacancy.publishedAt = null;

    return successRes(await this.vacancyRepo.save(vacancy));
  }

  async listPublic(query: VacancyQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const now = new Date(); // Joriy vaqt

    const qb = this.vacancyRepo.createQueryBuilder('v')
      .leftJoinAndSelect('v.company', 'c')
      .where('v.isDeleted = false')
      .andWhere('v.isActive = true')
      .andWhere('v.status = :status', { status: VacancyStatus.PUBLISHED });

    // 🔥 Dinamik Premium maydoni: isPremium true bo'lsa VA muddati tugamagan bo'lsa
    qb.addSelect(
      `(CASE WHEN v.isPremium = true AND v.premiumUntil > :now THEN 1 ELSE 0 END)`,
      'is_actually_premium'
    ).setParameter('now', now);

    // 🔍 Qidiruv (Title yoki Company Name)
    if (query.q) {
      qb.andWhere('(v.title ILIKE :q OR c.name ILIKE :q)', { q: `%${query.q}%` });
    }

    // 📍 Shahar bo'yicha filtr
    if (query.city) {
      qb.andWhere('v.city ILIKE :city', { city: `%${query.city}%` });
    }

    // 💼 Ish turi bo'yicha filtr
    if (query.employmentType) {
      qb.andWhere('v.employmentType = :type', { type: query.employmentType });
    }

    // 💰 Maosh bo'yicha filtr
    if (query.minSalary) {
      qb.andWhere('v.salary >= :minSalary', { minSalary: query.minSalary });
    }

    // 🔝 Haqiqiy premiumlar doim birinchi, keyin sanaga ko'ra
    qb.orderBy('is_actually_premium', 'DESC')
      .addOrderBy('v.publishedAt', 'DESC');

    const [data, total] = await qb.take(limit).skip((page - 1) * limit).getManyAndCount();
    return Pager.of(200, { uz: 'OK', en: 'OK', ru: 'OK' }, data, total, limit, page);
  }

  async adminSetPremium(vacancyId: string, days: number) {
    const v = await this.vacancyRepo.findOne({ where: { id: vacancyId } as any });
    if (!v) throw new NotFoundException('Vacancy not found');

    if (v.status !== VacancyStatus.PUBLISHED) {
      throw new BadRequestException('Only PUBLISHED vacancies can be premium');
    }

    const until = new Date();
    until.setDate(until.getDate() + days);

    v.isPremium = true;
    v.premiumUntil = until;

    const saved = await this.vacancyRepo.save(v);
    return successRes(saved);
  }

  async buyPremium(currentUser: { id: string; role: Roles }, vacancyId: string, dto: BuyPremiumDto) {
    const vacancy = await this.vacancyRepo.findOne({
      where: { id: vacancyId } as any,
      relations: ['company', 'company.owner'],
    });

    if (!vacancy) throw new NotFoundException('Vacancy not found');

    const isAdmin = [Roles.ADMIN, Roles.SUPER_ADMIN].includes(currentUser.role);
    const isOwner = vacancy.company?.owner?.id === currentUser.id;

    if (!isAdmin && !isOwner) throw new ForbiddenException('No access');

    const now = new Date();
    const base = vacancy.premiumUntil && vacancy.premiumUntil > now ? vacancy.premiumUntil : now;

    const until = new Date(base);
    until.setDate(until.getDate() + dto.days);

    vacancy.isPremium = true;
    vacancy.premiumUntil = until;

    const saved = await this.vacancyRepo.save(vacancy);
    return { ...saved, premiumUntil: saved.premiumUntil };
  }
}