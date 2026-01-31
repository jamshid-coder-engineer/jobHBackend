import { Column, Entity as OrmEntity, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Vacancy } from './vacancy.entity';
import { User } from './user.entity';

export enum ApplicationStatus {
  NEW = 'NEW',
  REVIEWED = 'REVIEWED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

@OrmEntity('applications')
export class Application extends BaseEntity {
  @ManyToOne(() => Vacancy, { eager: true })
  vacancy: Vacancy;

  @ManyToOne(() => User, { eager: true })
  applicant: User; // STUDENT

  @Column({ type: 'text', nullable: true })
  coverLetter: string | null;

  @Column({ type: 'enum', enum: ApplicationStatus, default: ApplicationStatus.NEW })
  status: ApplicationStatus;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
