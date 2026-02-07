import { Column, Entity as OrmEntity, ManyToOne, OneToMany, JoinColumn, ManyToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Company } from './company.entity';
import { Application } from './application.entity';
import { EmploymentType, VacancyStatus } from 'src/common/enum/roles.enum';
import { User } from './user.entity';

@OrmEntity('vacancies')
export class Vacancy extends BaseEntity {
  @ManyToOne(() => Company, (company) => company.vacancies, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @Column({ type: 'uuid' })
  companyId: string;

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

  @Column({
    type: 'enum',
    enum: EmploymentType,
    default: EmploymentType.FULL_TIME,
  })
  employmentType: EmploymentType;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'enum', enum: VacancyStatus, default: VacancyStatus.DRAFT })
  status: VacancyStatus;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt?: Date | null;

  @Column({ type: 'varchar', nullable: true })
  rejectedReason?: string | null;

  @Column({ type: 'boolean', default: false })
  isPremium: boolean;

  @Column({ type: 'timestamp', nullable: true })
  premiumUntil?: Date | null;

  @ManyToMany(() => User, (user) => user.savedVacancies)
  savedByUsers: User[];


  @OneToMany(() => Application, (application) => application.vacancy)
  applications: Application[];
}
