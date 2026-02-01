import { ConflictException, ForbiddenException, Injectable, NotFoundException, Inject } from '@nestjs/common';
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
    private readonly socketGateway: SocketGateway, // Socket ulandi
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async apply(currentUser: { id: string; role: Roles }, dto: CreateApplicationDto) {
    if (currentUser.role !== Roles.CANDIDATE) throw new ForbiddenException('Only candidates can apply');

    const vacancy = await this.vacancyRepo.findOne({ where: { id: dto.vacancyId, isDeleted: false, isActive: true } as any });
    if (!vacancy) throw new NotFoundException('Active vacancy not found');

    const exists = await this.appRepo.findOne({
      where: { vacancy: { id: vacancy.id }, applicant: { id: currentUser.id }, isDeleted: false } as any,
    });
    if (exists) throw new ConflictException('You already applied to this vacancy');

    const application = this.appRepo.create({
      vacancy,
      applicant: { id: currentUser.id } as any,
      coverLetter: dto.coverLetter ?? null,
      status: ApplicationStatus.NEW,
    });

    const saved = await this.appRepo.save(application);
    
    // Keshni tozalash (Admin dashboard yangilanishi uchun)
    await this.cacheManager.del('admin_stats');
    
    return successRes(saved, 201);
  }

  async myApplications(currentUser: { id: string }) {
    // Shaxsiy arizalarni keshdan qidirish
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

  async employerApplications(currentUser: { id: string }) {
    const data = await this.appRepo.find({
      where: { vacancy: { company: { ownerId: currentUser.id } }, isDeleted: false } as any,
      relations: ['vacancy', 'applicant', 'applicant.resume'],
      order: { createdAt: 'DESC' },
    });
    return successRes(data);
  }

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

    // 1. Real-time xabar yuborish (Socket)
    this.socketGateway.sendToUser(application.applicant.id, 'application_update', {
      status: dto.status,
      vacancy: application.vacancy.title,
      company: application.vacancy.company.name
    });

    // 2. Email xabar yuborish
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

    // 3. Keshni tozalash
    await this.cacheManager.del(`my_apps_${application.applicant.id}`);
    await this.cacheManager.del('admin_stats');

    return successRes(saved);
  }
}