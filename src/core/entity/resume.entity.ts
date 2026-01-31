import { Column, Entity as OrmEntity, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@OrmEntity('resumes')
export class Resume extends BaseEntity {
  @OneToOne(() => User, { eager: true })
  @JoinColumn()
  owner: User;

  @Column({ type: 'varchar', nullable: true })
  fullName?: string;

  @Column({ type: 'varchar', nullable: true })
  title?: string; // masalan: "Frontend Developer"

  @Column({ type: 'text', nullable: true })
  about?: string;

  @Column({ type: 'varchar', nullable: true })
  city?: string;

  @Column({ type: 'varchar', nullable: true })
  phone?: string;

  @Column({ type: 'varchar', nullable: true })
  skills?: string; // hozircha text; keyin array/json qilamiz

  @Column({ type: 'varchar', nullable: true })
  cvFile?: string; // keyin upload (pdf)

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
