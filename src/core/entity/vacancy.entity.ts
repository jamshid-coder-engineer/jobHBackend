import { Column, Entity as OrmEntity, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Company } from './company.entity';

export enum EmploymentType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  CONTRACT = 'CONTRACT',
  INTERN = 'INTERN',
  REMOTE = 'REMOTE',
}

@OrmEntity('vacancies')
export class Vacancy extends BaseEntity {
  @ManyToOne(() => Company, { eager: true })
  company: Company;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', nullable: true })
  city?: string | null;

  @Column({ type: 'varchar', nullable: true })
  salaryFrom?: string | null;

  @Column({ type: 'varchar', nullable: true })
  salaryTo?: string | null;

  @Column({ type: 'enum', enum: EmploymentType, default: EmploymentType.FULL_TIME })
  employmentType: EmploymentType;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
