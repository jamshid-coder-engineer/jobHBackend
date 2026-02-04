import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from 'src/core/entity/company.entity';
import { Vacancy } from 'src/core/entity/vacancy.entity';
import { Application } from 'src/core/entity/application.entity';
import { ApplicationStatus } from 'src/common/enum/roles.enum';
import { successRes } from 'src/infrastructure/response/success.response';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Company) private readonly companyRepo: Repository<Company>,
    @InjectRepository(Vacancy) private readonly vacancyRepo: Repository<Vacancy>,
    @InjectRepository(Application) private readonly appRepo: Repository<Application>,
  ) {}

  async getDashboardStats() {
    const [companiesCount, vacanciesCount, applicationsCount] = await Promise.all([
      this.companyRepo.count({ where: { isDeleted: false } as any }),
      this.vacancyRepo.count({ where: { isDeleted: false } as any }),
      this.appRepo.count({ where: { isDeleted: false } as any }),
    ]);

    const hiredCount = await this.appRepo.count({
      where: { status: ApplicationStatus.ACCEPTED, isDeleted: false } as any,
    });

    const topCompanies = await this.appRepo
      .createQueryBuilder('app')
      .leftJoin('app.vacancy', 'vacancy')
      .leftJoin('vacancy.company', 'company')
      .select('company.name', 'name')
      .addSelect('COUNT(app.id)', 'hired_candidates')
      .where('app.status = :status', { status: ApplicationStatus.ACCEPTED })
      .groupBy('company.id')
      .addGroupBy('company.name')
      .orderBy('hired_candidates', 'DESC')
      .limit(5)
      .getRawMany();

    return successRes({
      summary: {
        totalCompanies: companiesCount,
        totalVacancies: vacanciesCount,
        totalApplications: applicationsCount,
        totalHired: hiredCount,
      },
      leaderboard: topCompanies,
    });
  }
}
