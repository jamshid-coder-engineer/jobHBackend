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

import { BaseService } from 'src/infrastructure/base/base.service';
import { successRes } from 'src/infrastructure/response/success.response';
import { RepositoryPager } from 'src/infrastructure/pagination/RepositoryPager';
import {
  ISuccess,
  IResponsePagination,
  IFindOptions,
} from 'src/infrastructure/pagination/successResponse';

import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';

@Injectable()
export class ApplicationService extends BaseService<
  CreateApplicationDto,
  UpdateApplicationStatusDto,
  Application
> {
  constructor(
    @InjectRepository(Application)
    private readonly appRepo: Repository<Application>,
    @InjectRepository(Vacancy)
    private readonly vacancyRepo: Repository<Vacancy>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {
    super(appRepo);
  }

  // STUDENT -> apply
  async apply(currentUser: { id: string; role: Roles }, dto: CreateApplicationDto): Promise<ISuccess> {
    if (currentUser.role !== Roles.STUDENT) {
      throw new ForbiddenException('Only candidate can apply');
    }

    const user = await this.userRepo.findOne({
      where: { id: currentUser.id, isDeleted: false } as any,
    });
    if (!user) throw new NotFoundException('User not found');

    const vacancy = await this.vacancyRepo.findOne({
      where: { id: dto.vacancyId } as any,
    });
    if (!vacancy) throw new NotFoundException('Vacancy not found');
    if (!vacancy.isActive) throw new ForbiddenException('Vacancy is not active');

    const exists = await this.appRepo.findOne({
      where: {
        isDeleted: false,
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

    const saved = await this.appRepo.save(application);
    return successRes(saved, 201);
  }

  // STUDENT -> my applications (pagination)
  async myApplications(
    currentUser: { id: string; role: Roles },
    options?: IFindOptions<Application>,
  ): Promise<IResponsePagination> {
    if (currentUser.role !== Roles.STUDENT) throw new ForbiddenException();

   return RepositoryPager.findAll(this.appRepo, {
  ...(options || {}),
  relations: ['vacancy', 'vacancy.company'],
  where: {
    isDeleted: false,
    applicant: { id: currentUser.id },
    ...(options?.where || {}),
  } as any,
  order: options?.order || ({ createdAt: 'DESC' } as any),
});
  }

  // TEACHER -> applications for my vacancies (pagination)
  async employerApplications(
    currentUser: { id: string; role: Roles },
    options?: IFindOptions<Application>,
  ): Promise<IResponsePagination> {
    if (currentUser.role !== Roles.TEACHER) throw new ForbiddenException();

    return RepositoryPager.findAll(this.appRepo, {
      ...(options || {}),
      relations: ['vacancy', 'vacancy.company', 'applicant'],
      where: {
        isDeleted: false,
        applicant: { id: currentUser.id },
        ...(options?.where || {}),
      } as any,
      order: options?.order || ({ createdAt: 'DESC' } as any),
    });
  }

  // TEACHER owner OR ADMIN -> status update
  async updateApplicationStatus(
    currentUser: { id: string; role: Roles },
    applicationId: string,
    dto: UpdateApplicationStatusDto,
  ): Promise<ISuccess> {
    const application = await this.appRepo.findOne({
      where: { id: applicationId, isDeleted: false } as any,
    });
    if (!application) throw new NotFoundException('Application not found');

    const isAdmin = [Roles.ADMIN, Roles.SUPER_ADMIN].includes(currentUser.role);
    const isOwner =
      currentUser.role === Roles.TEACHER &&
      application.vacancy?.company?.owner?.id === currentUser.id;

    if (!isAdmin && !isOwner) throw new ForbiddenException();

    application.status = dto.status;
    const saved = await this.appRepo.save(application);

    return successRes(saved);
  }

}
