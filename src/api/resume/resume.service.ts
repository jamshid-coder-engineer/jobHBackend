import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Resume } from 'src/core/entity/resume.entity';
import { User } from 'src/core/entity/user.entity';
import { Roles } from 'src/common/enum/roles.enum';

import { CreateResumeDto } from './dto/create-resume.dto';
import { UpdateResumeDto } from './dto/update-resume.dto';

@Injectable()
export class ResumeService {
  constructor(
    @InjectRepository(Resume) private readonly resumeRepo: Repository<Resume>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async create(currentUser: { id: string; role: Roles }, dto: CreateResumeDto) {
    if (currentUser.role !== Roles.STUDENT) {
      throw new ForbiddenException('Only candidate can create resume');
    }

    const owner = await this.userRepo.findOne({ where: { id: currentUser.id, isDeleted: false } });
    if (!owner) throw new NotFoundException('User not found');

    const exists = await this.resumeRepo.findOne({
      where: { owner: { id: owner.id } } as any,
    });
    if (exists) throw new ConflictException('Resume already exists for this user');

    const resume = this.resumeRepo.create({
      owner,
      ...dto,
      isActive: true,
    });

    return this.resumeRepo.save(resume);
  }

  async getMyResume(currentUser: { id: string }) {
    const resume = await this.resumeRepo.findOne({
      where: { owner: { id: currentUser.id } } as any,
    });
    if (!resume) throw new NotFoundException('Resume not found');
    return resume;
  }

  async update(currentUser: { id: string; role: Roles }, id: string, dto: UpdateResumeDto) {
    const resume = await this.resumeRepo.findOne({
      where: { id } as any,
      relations: ['owner'],
    });
    if (!resume) throw new NotFoundException('Resume not found');

    const isOwner = resume.owner?.id === currentUser.id;
    const isAdmin = [Roles.ADMIN, Roles.SUPER_ADMIN].includes(currentUser.role);

    if (!isOwner && !isAdmin) throw new ForbiddenException();

    await this.resumeRepo.update(id as any, dto as any);
    return this.resumeRepo.findOne({ where: { id } as any });
  }
}
