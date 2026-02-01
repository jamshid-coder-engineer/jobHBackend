import { Column, Entity as OrmEntity, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Vacancy } from './vacancy.entity';
import { User } from './user.entity';
import { Resume } from './resume.entity';
import { ApplicationStatus } from 'src/common/enum/roles.enum';

@OrmEntity('applications')
@Unique(['vacancy', 'applicant']) // User bitta vakansiyaga faqat 1 marta apply qila oladi
export class Application extends BaseEntity {
  @ManyToOne(() => Vacancy, (vacancy) => vacancy.applications, { 
    eager: true, 
    onDelete: 'CASCADE' 
  })
  vacancy: Vacancy;

  @ManyToOne(() => User, (user) => user.applications, { eager: true })
  applicant: User;

  @ManyToOne(() => Resume, { nullable: true })
  resume: Resume;

  @Column({ type: 'text', nullable: true })
  coverLetter: string | null;

  @Column({
    type: 'enum',
    enum: ApplicationStatus,
    default: ApplicationStatus.NEW,
  })
  status: ApplicationStatus;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}