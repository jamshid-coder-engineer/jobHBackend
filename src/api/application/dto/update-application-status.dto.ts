import { IsEnum } from 'class-validator';
import { ApplicationStatus } from 'src/core/entity/application.entity';

export class UpdateApplicationStatusDto {
  @IsEnum(ApplicationStatus)
  status: ApplicationStatus;
}
