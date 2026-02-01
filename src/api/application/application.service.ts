import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Application } from 'src/core/entity/application.entity';
import { Vacancy } from 'src/core/entity/vacancy.entity';
import { User } from 'src/core/entity/user.entity';
import { Roles } from 'src/common/enum/roles.enum';
import { successRes } from 'src/infrastructure/response/success.response';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';
import { ApplicationStatus } from 'src/common/enum/roles.enum';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class ApplicationService {
  constructor(
    @InjectRepository(Application) private readonly appRepo: Repository<Application>,
    @InjectRepository(Vacancy) private readonly vacancyRepo: Repository<Vacancy>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly mailerService: MailerService,
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
    return successRes(saved, 201);
  }

  async myApplications(currentUser: { id: string }) {
    const data = await this.appRepo.find({
      where: { applicant: { id: currentUser.id }, isDeleted: false } as any,
      relations: ['vacancy', 'vacancy.company'],
      order: { createdAt: 'DESC' },
    });
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

    try {
      if (dto.status === ApplicationStatus.ACCEPTED) {
        await this.mailerService.sendMail({
          to: application.applicant.email,
          subject: 'Tabriklaymiz! Arizangiz qabul qilindi',
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px;">
              <h2 style="color: #2e7d32;">Xushxabar!</h2>
              <p>Sizning <b>"${application.vacancy.title}"</b> vakansiyasi uchun topshirgan arizangiz 
              <b>"${application.vacancy.company.name}"</b> tomonidan ma'qullandi.</p>
              <p>Tez orada kompaniya mas'ul xodimlari siz bilan bog'lanishadi.</p>
              <p>Omad yor bo'lsin!</p>
              <hr style="border: 0; border-top: 1px solid #eee;">
              <footer style="font-size: 12px; color: #888;">Bu xabar HH Job System orqali avtomatik yuborildi.</footer>
            </div>
          `,
        });
      } else if (dto.status === ApplicationStatus.REJECTED) {
        await this.mailerService.sendMail({
          to: application.applicant.email,
          subject: 'Arizangiz bo\'yicha javob',
          html: `<p>Afsuski, sizning "${application.vacancy.title}" vakansiyasi uchun arizangiz rad etildi. Keyingi ishlaringizda omad tilaymiz.</p>`,
        });
      }
    } catch (mailError) {
      console.error('❌ Email yuborishda xatolik yuz berdi:', mailError.message);
    }

    return successRes(saved);
  }
}
