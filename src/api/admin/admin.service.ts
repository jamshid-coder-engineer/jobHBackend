import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from 'src/core/entity/company.entity';
import { Vacancy } from 'src/core/entity/vacancy.entity';
import { Application } from 'src/core/entity/application.entity';
import { ApplicationStatus, Roles } from 'src/common/enum/roles.enum';
import { successRes } from 'src/infrastructure/response/success.response';
import { CreateAdminDto } from './dto/create-admin.dto';
import { CryptoService } from 'src/infrastructure/crypto/crypto.service';
import { User } from 'src/core/entity/user.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Company) private readonly companyRepo: Repository<Company>,
    @InjectRepository(Vacancy) private readonly vacancyRepo: Repository<Vacancy>,
    @InjectRepository(Application) private readonly appRepo: Repository<Application>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly cryptoService: CryptoService,
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

 async createAdmin(dto: CreateAdminDto) {
    const exist = await this.userRepo.findOne({ where: { email: dto.email } as any });
    if (exist) throw new BadRequestException('Bu email allaqachon mavjud');

    
    const hashedPassword = await this.cryptoService.encrypt(dto.password);

    const newAdmin = this.userRepo.create({
      email: dto.email,
      
      
      
      
      passwordHash: hashedPassword, 
      
      firstName: dto.firstName,
      role: Roles.ADMIN,
      isActive: true,
    });

    await this.userRepo.save(newAdmin);
    return successRes({ message: 'Yangi admin muvaffaqiyatli yaratildi' });
  }
  
  async listAdmins() {
    const admins = await this.userRepo.find({
      where: { role: Roles.ADMIN } as any,
      order: { createdAt: 'DESC' },
      select: ['id', 'firstName', 'email', 'createdAt', 'isActive'] 
    });
    return successRes(admins);
  }
  
  
  async deleteAdmin(id: string) {
     await this.userRepo.delete(id);
     return successRes({ message: 'Admin o\'chirildi' });
  }
}


