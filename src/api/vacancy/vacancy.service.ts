import { ForbiddenException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { successRes } from 'src/infrastructure/response/success.response';
import type { ISuccess } from 'src/infrastructure/pagination/successResponse';
import { Pager } from 'src/infrastructure/pagination/Pager';

import { Vacancy } from 'src/core/entity/vacancy.entity';
import { VacancyStatus, Roles } from 'src/common/enum/roles.enum';
import { Company } from 'src/core/entity/company.entity';
import { CreateVacancyDto } from './dto/create-vacancy.dto';
import { UpdateVacancyDto } from './dto/update-vacancy.dto';
import { VacancyQueryDto } from './dto/vacancy-query.dto';
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
      status: VacancyStatus.PENDING,
      publishedAt: null,
      isActive: true,
    });

    const saved = await this.vacancyRepo.save(vacancy);
    return successRes(saved, 201);
  }

  async submitForModeration(currentUser: { id: string }, vacancyId: string): Promise<ISuccess> {
    const vacancy = await this.vacancyRepo.findOne({ 
      where: { id: vacancyId } as any,
      relations: ['company'] 
    });

    if (!vacancy) throw new NotFoundException('Vakansiya topilmadi');
    if (vacancy.company.ownerId !== currentUser.id) throw new ForbiddenException('Huquqingiz yo\'q');

    vacancy.status = VacancyStatus.PENDING;
    const saved = await this.vacancyRepo.save(vacancy);
    return successRes(saved);
  }
async listMyVacancies(currentUser: { id: string }): Promise<ISuccess> {
    console.log("🔍 REQUEST KELDI. User ID:", currentUser.id);
    const company = await this.companyRepo.findOne({
      where: { ownerId: currentUser.id, isDeleted: false } as any,
    });

    console.log("🏢 KOMPANIYA:", company ? `Topildi: ${company.name} (ID: ${company.id})` : "❌ Topilmadi!");

    
    if (!company) return successRes([], 200);

    
    
    const data = await this.vacancyRepo.find({
      where: { 
        companyId: company.id, 
        isDeleted: false 
      } as any,
      relations: ['company', 'applications'], 
      order: { createdAt: 'DESC' }, 
    });
console.log("📄 VAKANSIYALAR SONI:", data.length);

    return successRes(data);
  }

  async adminApprove(vacancyId: string) {
    const vacancy = await this.vacancyRepo.findOne({ where: { id: vacancyId } as any });
    if (!vacancy) throw new NotFoundException('Vakansiya topilmadi');

    vacancy.status = VacancyStatus.PUBLISHED;
    vacancy.publishedAt = new Date();
    
    return successRes(await this.vacancyRepo.save(vacancy));
  }

  async adminReject(vacancyId: string, reason: string): Promise<ISuccess> {
    const vacancy = await this.vacancyRepo.findOne({ where: { id: vacancyId, isDeleted: false } as any });
    if (!vacancy) throw new NotFoundException('Vakansiya topilmadi');

    vacancy.status = VacancyStatus.REJECTED;
    vacancy.rejectedReason = reason || 'Talablarga javob bermaydi';
    vacancy.publishedAt = null;

    const saved = await this.vacancyRepo.save(vacancy);
    return successRes(saved);
  }

  async findOne(id: string): Promise<ISuccess> {
    const vacancy = await this.vacancyRepo.findOne({
      where: { id: id, isDeleted: false } as any,
      relations: ['company'], 
    });
    if (!vacancy) throw new NotFoundException('Vakansiya topilmadi');
    return successRes(vacancy);
  }
  async update(currentUser: { id: string; role: any }, vacancyId: string, dto: UpdateVacancyDto): Promise<ISuccess> {
    const vacancy = await this.vacancyRepo.findOne({ 
        where: { id: vacancyId } as any,
        relations: ['company'] 
    });
    if (!vacancy) throw new NotFoundException('Vacancy not found');

    if (vacancy.company.ownerId !== currentUser.id) {
        throw new ForbiddenException('Bu vakansiya sizga tegishli emas');
    }

    Object.assign(vacancy, dto);
    const saved = await this.vacancyRepo.save(vacancy);
    return successRes(saved);
  }

  async listPublic(query: VacancyQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const now = new Date();

    const qb = this.vacancyRepo.createQueryBuilder('v')
      .leftJoinAndSelect('v.company', 'c')
      .where('v.isDeleted = false')
      .andWhere('v.isActive = true')
      .andWhere('v.status = :status', { status: VacancyStatus.PUBLISHED });

    qb.addSelect(
      `(CASE WHEN v.isPremium = true AND v.premiumUntil > :now THEN 1 ELSE 0 END)`,
      'is_actually_premium'
    ).setParameter('now', now);

    if (query.q) {
      qb.andWhere('(v.title ILIKE :q OR c.name ILIKE :q)', { q: `%${query.q}%` });
    }
    if (query.city) {
      qb.andWhere('v.city ILIKE :city', { city: `%${query.city}%` });
    }

    qb.orderBy('is_actually_premium', 'DESC')
      .addOrderBy('v.publishedAt', 'DESC');

    const [data, total] = await qb.take(limit).skip((page - 1) * limit).getManyAndCount();
    
    return Pager.of(200, { uz: 'OK', en: 'OK', ru: 'OK' }, data, total, limit, page);
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



  
  async getAutocomplete(query: string): Promise<string[]> {
    if (!query) return [];

    const result = await this.vacancyRepo
      .createQueryBuilder('v')
      .select('DISTINCT v.title', 'title') 
      .where('v.title ILIKE :q', { q: `%${query}%` })
      .andWhere('v.status = :status', { status: VacancyStatus.PUBLISHED }) 
      .limit(5) 
      .getRawMany();

    
    return result.map((item) => item.title);
  }



  
  async getAutocompleteCity(query: string): Promise<string[]> {
    if (!query) return [];

    const result = await this.vacancyRepo
      .createQueryBuilder('v')
      .select('DISTINCT v.city', 'city') 
      .where('v.city ILIKE :q', { q: `%${query}%` })
      .andWhere('v.status = :status', { status: VacancyStatus.PUBLISHED })
      .limit(5)
      .getRawMany();

    return result.map((item) => item.city);
  }

  async buyPremium(currentUser: { id: string; role: Roles }, vacancyId: string, dto: BuyPremiumDto) {
    const vacancy = await this.vacancyRepo.findOne({
      where: { id: vacancyId } as any,
      relations: ['company'],
    });

    if (!vacancy) throw new NotFoundException('Vacancy not found');

    const now = new Date();
    const base = vacancy.premiumUntil && vacancy.premiumUntil > now ? vacancy.premiumUntil : now;
    const until = new Date(base);
    until.setDate(until.getDate() + dto.days);

    vacancy.isPremium = true;
    vacancy.premiumUntil = until;

    const saved = await this.vacancyRepo.save(vacancy);
    return successRes(saved);
  }

  async adminSetPremium(vacancyId: string, days: number): Promise<ISuccess> {
    const v = await this.vacancyRepo.findOne({ where: { id: vacancyId } as any });
    if (!v) throw new NotFoundException('Vacancy not found');

    if (v.status !== VacancyStatus.PUBLISHED) {
      throw new BadRequestException('Faqat tasdiqlangan vakansiyalar premium bo\'lishi mumkin');
    }

    const until = new Date();
    until.setDate(until.getDate() + days);

    v.isPremium = true;
    v.premiumUntil = until;

    const saved = await this.vacancyRepo.save(v);
    return successRes(saved);
  }

  async remove(currentUser: { id: string }, id: string): Promise<ISuccess> {
    const vacancy = await this.vacancyRepo.findOne({
      where: { id: id, isDeleted: false } as any,
      relations: ['company'],
    });

    if (!vacancy) throw new NotFoundException('Vakansiya topilmadi');

    if (vacancy.company.ownerId !== currentUser.id) {
      throw new ForbiddenException('Sizda bu vakansiyani oʻchirish huquqi yoʻq');
    }

    vacancy.isDeleted = true;
    await this.vacancyRepo.save(vacancy);

    return successRes({ message: 'Vakansiya muvaffaqiyatli oʻchirildi' });
  }
}
