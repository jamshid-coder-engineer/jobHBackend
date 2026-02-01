import { Column, Entity as OrmEntity, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Vacancy } from './vacancy.entity';
import { CompanyStatus } from 'src/common/enum/roles.enum';

@OrmEntity('companies')
export class Company extends BaseEntity {
  @Column({ type: 'varchar', length: 120, unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'varchar', nullable: true })
  website?: string | null;

  @Column({ type: 'varchar', nullable: true })
  location?: string | null;

  @Column({ type: 'varchar', nullable: true })
  logo?: string | null;

  @Column({ type: 'enum', enum: CompanyStatus, default: CompanyStatus.PENDING })
  status: CompanyStatus;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt?: Date | null;

  @Column({ type: 'varchar', nullable: true })
  rejectedReason?: string | null;

  @Column({ type: 'boolean', default: false })
  isVerified: boolean;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt?: Date | null;

  @ManyToOne(() => User, (user) => user.company, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' }) // Bu ownerId ustunini User ID bilan bog'laydi
  owner: User;

  @Column({ type: 'varchar' })
  ownerId: string;

  @OneToMany(() => Vacancy, (vacancy) => vacancy.company)
  vacancies: Vacancy[];
}