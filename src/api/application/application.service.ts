import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Application, ApplicationStatus } from 'src/core/entity/application.entity';
import { Vacancy } from 'src/core/entity/vacancy.entity';
import { User } from 'src/core/entity/user.entity';
import { Roles } from 'src/common/enum/roles.enum';

import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';

@Injectable()
export class ApplicationService {
  constructor(
    @InjectRepository(Application) private readonly appRepo: Repository<Application>,
    @InjectRepository(Vacancy) private readonly vacancyRepo: Repository<Vacancy>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  // STUDENT -> apply
  async apply(currentUser: { id: string; role: Roles }, dto: CreateApplicationDto) {
    if (currentUser.role !== Roles.STUDENT) {
      throw new ForbiddenException('Only candidate can apply');
    }

    const user = await this.userRepo.findOne({ where: { id: currentUser.id, isDeleted: false } });
    if (!user) throw new NotFoundException('User not found');

    const vacancy = await this.vacancyRepo.findOne({ where: { id: dto.vacancyId } as any });
    if (!vacancy) throw new NotFoundException('Vacancy not found');
    if (!vacancy.isActive) throw new ForbiddenException('Vacancy is not active');

    // bir student bitta vacancy’ga 1 marta apply qilsin
    const exists = await this.appRepo.findOne({
      where: {
        vacancy: { id: vacancy.id },
        applicant: { id: user.id },
      } as any,
    });
    if (exists) throw new ConflictException('You already applied to this vacancy');

    const application = this.appRepo.create({
      vacancy,
      applicant: user,
      coverLetter: dto.coverLetter ?? null,
      status: ApplicationStatus.NEW,
      isActive: true,
    });

    return this.appRepo.save(application);
  }

  // STUDENT -> my applications
  async myApplications(currentUser: { id: string; role: Roles }) {
    if (currentUser.role !== Roles.STUDENT) throw new ForbiddenException();

    return this.appRepo.find({
      where: { applicant: { id: currentUser.id } } as any,
      order: { createdAt: 'DESC' as any },
    });
  }

  // TEACHER -> applications to my company's vacancies
  async employerApplications(currentUser: { id: string; role: Roles }) {
    if (currentUser.role !== Roles.TEACHER) throw new ForbiddenException();

    // vacancy.company.owner eager chain bo‘lgani uchun filtrni deep where bilan qilamiz
    return this.appRepo.find({
      where: {
        vacancy: {
          company: {
            owner: { id: currentUser.id },
          },
        },
      } as any,
      order: { createdAt: 'DESC' as any },
    });
  }

  // TEACHER (owner) yoki ADMIN -> status change
  async updateStatus(
    currentUser: { id: string; role: Roles },
    applicationId: string,
    dto: UpdateApplicationStatusDto,
  ) {
    const application = await this.appRepo.findOne({ where: { id: applicationId } as any });
    if (!application) throw new NotFoundException('Application not found');

    const isAdmin = [Roles.ADMIN, Roles.SUPER_ADMIN].includes(currentUser.role);

    const isOwner =
      currentUser.role === Roles.TEACHER &&
      application.vacancy?.company?.owner?.id === currentUser.id;

    if (!isAdmin && !isOwner) throw new ForbiddenException();

    application.status = dto.status;
    return this.appRepo.save(application);
  }
}
