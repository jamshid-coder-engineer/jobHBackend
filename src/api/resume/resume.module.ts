import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Resume } from 'src/core/entity/resume.entity';
import { User } from 'src/core/entity/user.entity';

import { ResumeController } from './resume.controller';
import { ResumeService } from './resume.service';

@Module({
  imports: [TypeOrmModule.forFeature([Resume, User])],
  controllers: [ResumeController],
  providers: [ResumeService],
})
export class ResumeModule {}
