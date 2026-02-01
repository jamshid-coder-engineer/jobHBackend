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

@Injectable()
export class ApplicationService {
  constructor(
    @InjectRepository(Application) private readonly appRepo: Repository<Application>,
    @InjectRepository(Vacancy) private readonly vacancyRepo: Repository<Vacancy>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
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
      relations: ['vacancy', 'vacancy.company'],
    });
    if (!application) throw new NotFoundException('Application not found');

    const isOwner = application.vacancy?.company?.ownerId === currentUser.id;
    const isAdmin = [Roles.ADMIN, Roles.SUPER_ADMIN].includes(currentUser.role);

    if (!isOwner && !isAdmin) throw new ForbiddenException('No access to this application');

    application.status = dto.status;
    const saved = await this.appRepo.save(application);
    return successRes(saved);
  }
}