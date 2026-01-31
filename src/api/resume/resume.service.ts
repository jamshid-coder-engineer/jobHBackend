import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';

import { Resume } from 'src/core/entity/resume.entity';
import { User } from 'src/core/entity/user.entity';
import { Roles } from 'src/common/enum/roles.enum';

import { BaseService } from 'src/infrastructure/base/base.service';
import { successRes } from 'src/infrastructure/response/success.response';
import { RepositoryPager } from 'src/infrastructure/pagination/RepositoryPager';
import {
  IFindOptions,
  IResponsePagination,
  ISuccess,
} from 'src/infrastructure/pagination/successResponse';

import { CreateResumeDto } from './dto/create-resume.dto';
import { UpdateResumeDto } from './dto/update-resume.dto';
import { removeUploadFileSafe } from '../../infrastructure/fileServise/file-remove';
import { config } from 'src/config';


@Injectable()
export class ResumeService extends BaseService<CreateResumeDto, UpdateResumeDto, Resume> {
  constructor(
    @InjectRepository(Resume)
    private readonly resumeRepo: Repository<Resume>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {
    super(resumeRepo);
  }

  // STUDENT -> create (1 user = 1 resume)
  async createResume(
    currentUser: { id: string; role: Roles },
    dto: CreateResumeDto,
  ): Promise<ISuccess> {
    if (currentUser.role !== Roles.STUDENT) {
      throw new ForbiddenException('Only candidate can create resume');
    }

    const owner = await this.userRepo.findOne({
      where: { id: currentUser.id, isDeleted: false } as any,
    });
    if (!owner) throw new NotFoundException('User not found');

    const exists = await this.resumeRepo.findOne({
      where: { owner: { id: owner.id }, isDeleted: false } as any,
    });
    if (exists) throw new ConflictException('Resume already exists for this user');

    const resume = this.resumeRepo.create({
      owner,
      ...dto,
      isActive: true,
    } as any);

    const saved = await this.resumeRepo.save(resume);
    return successRes(saved, 201);
  }

  // STUDENT -> my resume
  async myResume(currentUser: { id: string; role: Roles }): Promise<ISuccess> {
    if (currentUser.role !== Roles.STUDENT) throw new ForbiddenException();

    const resume = await this.resumeRepo.findOne({
      where: { owner: { id: currentUser.id }, isDeleted: false } as any,
    });

    if (!resume) throw new NotFoundException('Resume not found');
    return successRes(resume);
  }

  // STUDENT -> update my resume
  async updateMyResume(
    currentUser: { id: string; role: Roles },
    dto: UpdateResumeDto,
  ): Promise<ISuccess> {
    if (currentUser.role !== Roles.STUDENT) throw new ForbiddenException();

    const resume = await this.resumeRepo.findOne({
      where: { owner: { id: currentUser.id }, isDeleted: false } as any,
    });
    if (!resume) throw new NotFoundException('Resume not found');

    await this.resumeRepo.update(resume.id as any, dto as any);

    const updated = await this.resumeRepo.findOne({
      where: { id: resume.id } as any,
    });

    return successRes(updated);
  }

  async updateMyCv(
  currentUser: { id: string; role: Roles },
  filename: string,
) {
  if (currentUser.role !== Roles.STUDENT) throw new ForbiddenException();

  const resume = await this.resumeRepo.findOne({
    where: { owner: { id: currentUser.id }, isDeleted: false } as any,
  });
  if (!resume) throw new NotFoundException('Resume not found');

  // eski pdf ni o‘chiramiz
  await removeUploadFileSafe(resume.cvFile);

  // yangisini DB ga yozamiz
  resume.cvFile = `${config.UPLOAD.FOLDER}/cv/${filename}`;
  const saved = await this.resumeRepo.save(resume);

  return successRes(saved);
}


  // ADMIN -> list all resumes (pagination) (ixtiyoriy: moderation)
  async listAll(
    currentUser: { id: string; role: Roles },
    options?: IFindOptions<Resume>,
  ): Promise<IResponsePagination> {
    if (![Roles.ADMIN, Roles.SUPER_ADMIN].includes(currentUser.role)) {
      throw new ForbiddenException();
    }

    return RepositoryPager.findAll(this.resumeRepo, {
      ...(options || {}),
      where: {
        isDeleted: false,
        ...(options?.where || {}),
      } as any,
      order: options?.order || ({ createdAt: 'DESC' } as any),
    });
  }

  // PUBLIC search (ixtiyoriy) — HH’da resume search admin/employerga kerak bo‘lishi mumkin
  async searchPublic(
    q?: string,
    city?: string,
    page = 1,
    limit = 10,
  ): Promise<IResponsePagination> {
    const where: any = { isDeleted: false, isActive: true };

    if (q) {
      // title yoki fullName bo‘yicha qidiramiz
      where.title = ILike(`%${q}%`);
    }
    if (city) where.city = ILike(`%${city}%`);

    return RepositoryPager.findAll(this.resumeRepo, {
      where,
      skip: page,
      take: limit,
      order: { createdAt: 'DESC' },
    });
  }
}
