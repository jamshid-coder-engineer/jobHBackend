import { Column, Entity as OrmEntity, OneToOne, OneToMany } from 'typeorm';
import { Roles } from '../../common/enum/roles.enum';
import { BaseEntity } from './base.entity';
import { Company } from './company.entity';
import { Resume } from './resume.entity';
import { Application } from './application.entity';

@OrmEntity('users')
export class User extends BaseEntity {
  @Column({ type: 'varchar', unique: true })
  email: string;

@Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ type: 'varchar', select: false })
  passwordHash: string;

  @Column({ type: 'enum', enum: Roles, default: Roles.CANDIDATE })
  role: Roles;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @OneToOne(() => Company, (company) => company.owner)
  company: Company;

  @OneToOne(() => Resume, (resume) => resume.owner)
  resume: Resume;

  @OneToMany(() => Application, (application) => application.applicant)
  applications: Application[];
}