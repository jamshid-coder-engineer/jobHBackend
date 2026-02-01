import { ConflictException, ForbiddenException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Resume } from 'src/core/entity/resume.entity';
import { User } from 'src/core/entity/user.entity';
import { Roles } from 'src/common/enum/roles.enum';
import { successRes } from 'src/infrastructure/response/success.response';
import { RepositoryPager } from 'src/infrastructure/pagination/RepositoryPager';
import { CreateResumeDto } from './dto/create-resume.dto';
import { UpdateResumeDto } from './dto/update-resume.dto';
import { removeUploadFileSafe } from '../../infrastructure/fileServise/file-remove';
import { config } from 'src/config';

@Injectable()
export class ResumeService {
  constructor(
    @InjectRepository(Resume) private readonly resumeRepo: Repository<Resume>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async createResume(currentUser: { id: string; role: Roles }, dto: CreateResumeDto) {
    if (currentUser.role !== Roles.CANDIDATE) throw new ForbiddenException('Only candidates can create a resume');

    const exists = await this.resumeRepo.findOne({ where: { owner: { id: currentUser.id }, isDeleted: false } as any });
    if (exists) throw new ConflictException('Resume already exists');

    const resume = this.resumeRepo.create({
      ...dto,
      owner: { id: currentUser.id } as any,
      isActive: true,
    });

    return successRes(await this.resumeRepo.save(resume), 201);
  }

  async myResume(currentUser: { id: string }) {
    const resume = await this.resumeRepo.findOne({ where: { owner: { id: currentUser.id }, isDeleted: false } as any });
    if (!resume) throw new NotFoundException('Resume not found');
    return successRes(resume);
  }

  async updateMyResume(currentUser: { id: string }, dto: UpdateResumeDto) {
    const resume = await this.resumeRepo.findOne({ where: { owner: { id: currentUser.id }, isDeleted: false } as any });
    if (!resume) throw new NotFoundException('Resume not found');

    Object.assign(resume, dto);
    return successRes(await this.resumeRepo.save(resume));
  }

  async updateMyCv(currentUser: { id: string }, filename: string) {
    const resume = await this.resumeRepo.findOne({ where: { owner: { id: currentUser.id }, isDeleted: false } as any });
    if (!resume) throw new NotFoundException('Resume not found');

    if (resume.cvFile) {
      await removeUploadFileSafe(resume.cvFile);
    }

    resume.cvFile = `${config.UPLOAD.FOLDER}/cv/${filename}`;
    return successRes(await this.resumeRepo.save(resume));
  }

  async searchPublic(q?: string, city?: string, page = 1, limit = 10) {
    const where: any = { isDeleted: false, isActive: true };
    if (q) where.title = ILike(`%${q}%`);
    if (city) where.city = ILike(`%${city}%`);

    return RepositoryPager.findAll(this.resumeRepo, {
      where,
      take: limit,
      skip: (page - 1) * limit,
      order: { createdAt: 'DESC' },
    });
  }
}
