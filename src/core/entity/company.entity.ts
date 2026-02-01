import { Column, Entity as OrmEntity, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@OrmEntity('companies')
export class Company extends BaseEntity {
  @OneToOne(() => User, { eager: true })
  @JoinColumn()
  owner: User;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'varchar', nullable: true })
  website?: string | null;

  @Column({ type: 'varchar', nullable: true })
  location?: string | null;

  @Column({ type: 'varchar', nullable: true })
  logo?: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
