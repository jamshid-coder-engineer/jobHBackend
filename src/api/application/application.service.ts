import { 
  ConflictException, 
  ForbiddenException, 
  Injectable, 
  NotFoundException, 
  Inject, 
  BadRequestException // ⚠️ YANGI: Xatolik uchun
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Application } from 'src/core/entity/application.entity';
import { Vacancy } from 'src/core/entity/vacancy.entity';
import { User } from 'src/core/entity/user.entity';
import { Roles, ApplicationStatus } from 'src/common/enum/roles.enum';
import { successRes } from 'src/infrastructure/response/success.response';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';
import { MailerService } from '@nestjs-modules/mailer';
import { SocketGateway } from '../socket/socket.gateway';

@Injectable()
export class ApplicationService {
  constructor(
    @InjectRepository(Application) private readonly appRepo: Repository<Application>,
    @InjectRepository(Vacancy) private readonly vacancyRepo: Repository<Vacancy>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly mailerService: MailerService,
    private readonly socketGateway: SocketGateway,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * ARIZA TOPSHIRISH (Candidate)
   */
  async apply(currentUser: { id: string; role: Roles }, dto: CreateApplicationDto) {
    // 1. Rolni tekshirish
    if (currentUser.role !== Roles.CANDIDATE) {
      throw new ForbiddenException('Only candidates can apply');
    }

    // 2. ⚠️ YANGI: PROFIL TO'LIQLIGINI TEKSHIRISH
    const candidate = await this.userRepo.findOne({ 
      where: { id: currentUser.id } as any,
      relations: ['resume'] 
    });

    // ⚠️ 1-XATONI TUZATISH: User topilmasa xato qaytaramiz
    if (!candidate) {
        throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    // ⚠️ 2-XATONI TUZATISH: Endi bemalol tekshirsak bo'ladi
    // (Agar User Entityga firstName va phone qo'shgan bo'lsangiz, qizil chiziq yo'qoladi)
    if (!candidate.firstName || !candidate.phone) {
      throw new BadRequestException('PROFILE_INCOMPLETE'); 
    }
    // 3. Vakansiya bormi?
    const vacancy = await this.vacancyRepo.findOne({ 
      where: { id: dto.vacancyId, isDeleted: false, isActive: true } as any 
    });
    if (!vacancy) throw new NotFoundException('Active vacancy not found');

    // 4. DUBLIKAT TEKSHIRUVI (Siz so'ragan "Allaqachon topshirgansiz" qismi)
    const exists = await this.appRepo.findOne({
      where: { 
        vacancy: { id: vacancy.id }, 
        applicant: { id: currentUser.id }, 
        isDeleted: false 
      } as any,
    });
    
    if (exists) {
      // Frontend "ALREADY_APPLIED" ni ushlab warning chiqaradi
      throw new ConflictException('ALREADY_APPLIED'); 
    }

    // 5. Yaratish
    const application = this.appRepo.create({
      vacancy,
      applicant: { id: currentUser.id } as any,
      coverLetter: dto.coverLetter ?? null,
      status: ApplicationStatus.NEW,
    });

    const saved = await this.appRepo.save(application);

    // 6. KESHNI TOZALASH
    await this.cacheManager.del('admin_stats');
    // ⚠️ User o'zining arizalarini darrov ko'rishi uchun uning keshini ham o'chiramiz
    await this.cacheManager.del(`my_apps_${currentUser.id}`);

    return successRes(saved, 201);
  }

  /**
   * MENING ARIZALARIM (Candidate)
   */
  async myApplications(currentUser: { id: string }) {
    const cacheKey = `my_apps_${currentUser.id}`;
    const cachedData = await this.cacheManager.get(cacheKey);
    if (cachedData) return successRes(cachedData);

    const data = await this.appRepo.find({
      where: { applicant: { id: currentUser.id }, isDeleted: false } as any,
      relations: ['vacancy', 'vacancy.company'],
      order: { createdAt: 'DESC' },
    });

    await this.cacheManager.set(cacheKey, data, 60000); // 1 daqiqa kesh
    return successRes(data);
  }

  /**
   * ISH BERUVCHI UCHUN ARIZALAR
   */
  async employerApplications(currentUser: { id: string }) {
    const data = await this.appRepo.find({
      where: { vacancy: { company: { ownerId: currentUser.id } }, isDeleted: false } as any,
      relations: ['vacancy', 'applicant', 'applicant.resume'],
      order: { createdAt: 'DESC' },
    });
    return successRes(data);
  }

  /**
   * STATUSNI O'ZGARTIRISH
   */
  async updateApplicationStatus(currentUser: { id: string; role: Roles }, applicationId: string, dto: UpdateApplicationStatusDto) {
    const application = await this.appRepo.findOne({
      where: { id: applicationId, isDeleted: false } as any,
      relations: ['vacancy', 'vacancy.company', 'applicant'],
    });
    
    if (!application) throw new NotFoundException('Application not found');

    const isOwner = application.vacancy?.company?.ownerId === currentUser.id;
    const isAdmin = [Roles.ADMIN, Roles.SUPER_ADMIN].includes(currentUser.role);

    if (!isOwner && !isAdmin) throw new ForbiddenException('No access to this application');

    application.status = dto.status;
    const saved = await this.appRepo.save(application);

    // Socket orqali xabar
    this.socketGateway.sendToUser(application.applicant.id, 'application_update', {
      status: dto.status,
      vacancy: application.vacancy.title,
      company: application.vacancy.company.name
    });

    // Email yuborish
    try {
      if (dto.status === ApplicationStatus.ACCEPTED) {
        await this.mailerService.sendMail({
          to: application.applicant.email,
          subject: 'Tabriklaymiz! Arizangiz qabul qilindi',
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
              <h2 style="color: #2e7d32;">Xushxabar!</h2>
              <p>Sizning <b>"${application.vacancy.title}"</b> arizangiz qabul qilindi.</p>
            </div>
          `,
        });
      }
    } catch (e) { console.error('Email error:', e.message); }

    // Keshni tozalash
    await this.cacheManager.del(`my_apps_${application.applicant.id}`);
    await this.cacheManager.del('admin_stats');

    return successRes(saved);
  }
}