import { IsEnum } from 'class-validator';
import { ApplicationStatus } from 'src/common/enum/roles.enum';

export class UpdateApplicationStatusDto {
  @IsEnum(ApplicationStatus)
  status: ApplicationStatus;
}
