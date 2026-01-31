import { Column, Entity as OrmEntity } from 'typeorm';
import { Roles } from '../../common/enum/roles.enum';
import { BaseEntity } from './base.entity';

@OrmEntity('users')
export class User extends BaseEntity {
  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column({ type: 'varchar' })
  passwordHash: string;

  @Column({ type: 'enum', enum: Roles, default: Roles.STUDENT })
  role: Roles;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
