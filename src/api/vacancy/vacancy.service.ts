import { ForbiddenException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { successRes } from 'src/infrastructure/response/success.response';
import type { ISuccess } from 'src/infrastructure/pagination/successResponse';
import { Pager } from 'src/infrastructure/pagination/Pager';

import { Vacancy } from 'src/core/entity/vacancy.entity';
import { User } from 'src/core/entity/user.entity'; // 👈 USER IMPORT QILINDI
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
    // 👇 MANA SHU YERDA USER REPO QO'SHILDI
    @InjectRepository(User) private readonly userRepo: Repository<User>, 
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
    const company = await this.companyRepo.findOne({
      where: { ownerId: currentUser.id, isDeleted: false } as any,
    });

    if (!company) return successRes([], 200);
    
    const data = await this.vacancyRepo.find({
      where: { 
        companyId: company.id, 
        isDeleted: false 
      } as any,
      relations: ['company', 'applications'], 
      order: { createdAt: 'DESC' }, 
    });

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

    if (query.q) {
      qb.andWhere('(v.title ILIKE :q OR c.name ILIKE :q)', { q: `%${query.q}%` });
    }

    if (query.city) {
      qb.andWhere('v.city ILIKE :city', { city: `%${query.city}%` });
    }

    if (query.type) {
      qb.andWhere('v.employmentType = :type', { type: query.type });
    }

    if (query.minSalary) {
      qb.andWhere(
        `(
          (v.salaryTo IS NOT NULL AND CAST(v.salaryTo AS INTEGER) >= :minSalary) 
          OR 
          (v.salaryTo IS NULL AND v.salaryFrom IS NOT NULL AND CAST(v.salaryFrom AS INTEGER) >= :minSalary)
        )`, 
        { minSalary: query.minSalary }
      );
    }

    if (query.maxSalary) {
      qb.andWhere(
        '(v.salaryFrom IS NOT NULL AND CAST(v.salaryFrom AS INTEGER) <= :maxSalary)', 
        { maxSalary: query.maxSalary }
      );
    }

    if (query.date) {
      const dateThreshold = new Date();
      if (query.date === '1d') dateThreshold.setDate(dateThreshold.getDate() - 1);
      if (query.date === '3d') dateThreshold.setDate(dateThreshold.getDate() - 3);
      if (query.date === '7d') dateThreshold.setDate(dateThreshold.getDate() - 7);
      
      qb.andWhere('v.publishedAt >= :dateThreshold', { dateThreshold });
    }

    qb.addSelect(
      `(CASE WHEN v.isPremium = true AND v.premiumUntil > :now THEN 1 ELSE 0 END)`,
      'is_actually_premium'
    ).setParameter('now', now);

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

  // 👇 XATO TUZATILDI: TOGGLE SAVE FUNKSIYASI ENDI TO'G'RI ISHLAYDI
  async toggleSave(currentUser: { id: string }, vacancyId: string) {
    // 1. Userni o'zining saqlagan ishlari bilan birga olamiz (this.userRepo ISHLATILDI)
    const user = await this.userRepo.findOne({
      where: { id: currentUser.id } as any,
      relations: ['savedVacancies'], 
    });

    if (!user) throw new NotFoundException('User topilmadi');

    // 2. Vakansiyani topamiz
    const vacancy = await this.vacancyRepo.findOne({ where: { id: vacancyId } as any });
    if (!vacancy) throw new NotFoundException('Vakansiya topilmadi');

    // 3. Tekshiramiz: Bu ish allaqachon bormi?
    const existsIndex = user.savedVacancies.findIndex(v => v.id === vacancy.id);

    if (existsIndex > -1) {
      // BOR EKAN -> O'CHIRAMIZ (Unsave)
      user.savedVacancies.splice(existsIndex, 1);
      await this.userRepo.save(user); // this.userRepo ISHLATILDI
      return successRes({ isSaved: false, message: "Saqlanganlardan olib tashlandi" });
    } else {
      // YO'Q EKAN -> QO'SHAMIZ (Save)
      user.savedVacancies.push(vacancy);
      await this.userRepo.save(user); // this.userRepo ISHLATILDI
      return successRes({ isSaved: true, message: "Saqlanganlarga qo'shildi" });
    }
  }

  // ... class ichida
  async getMySavedVacancies(currentUser: { id: string }) {
    const user = await this.userRepo.findOne({
      where: { id: currentUser.id } as any,
      relations: ['savedVacancies', 'savedVacancies.company'], // Vakansiya va Kompaniyasini olib kelamiz
    });

    if (!user) return successRes([]);
    
    // Saqlangan vakansiyalarni qaytaramiz
    return successRes(user.savedVacancies);
  }
}