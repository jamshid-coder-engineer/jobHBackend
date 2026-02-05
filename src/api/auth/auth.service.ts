import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';

import { User } from 'src/core/entity/user.entity';
import { CryptoService } from 'src/infrastructure/crypto/crypto.service';
import { TokenService } from 'src/infrastructure/token/Token';
import { successRes } from 'src/infrastructure/response/success.response';
import { ISuccess } from 'src/infrastructure/pagination/successResponse';
import { Roles } from 'src/common/enum/roles.enum';
import { config } from 'src/config';

import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager'; 
import type { Cache } from 'cache-manager';
import { MailerService } from '@nestjs-modules/mailer';
import { v4 as uuidv4 } from 'uuid';

export interface ITokenPayload {
  id: string;
  role: Roles;
  isActive: boolean;
  iat?: number;
  exp?: number;
  
}

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly crypto: CryptoService,
    private readonly jwt: JwtService,
    private readonly tokenService: TokenService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly mailerService: MailerService,
  ) {}

  async onModuleInit() {
    const exists = await this.userRepo.findOne({
      where: { role: Roles.SUPER_ADMIN } as any,
    });

    if (!exists) {
      const passwordHash = await this.crypto.encrypt(config.SUPER_ADMIN.PASSWORD);

      const superAdmin = this.userRepo.create({
        email: config.SUPER_ADMIN.EMAIL,
        passwordHash,
        role: Roles.SUPER_ADMIN,
        isActive: true,
      });

      await this.userRepo.save(superAdmin);
      console.log(`🛡️ SUPER_ADMIN created: ${config.SUPER_ADMIN.EMAIL}`);
    }
  }

 async register(dto: RegisterDto): Promise<ISuccess> {
    const exists = await this.userRepo.findOne({ where: { email: dto.email } as any });
    if (exists && exists.isActive) throw new ConflictException('Bu email allaqachon mavjud');
    
    
    
    
    let user = exists;
    if (!user) {
      const passwordHash = await this.crypto.encrypt(dto.password);
      user = this.userRepo.create({
        email: dto.email,
        passwordHash,
        role: dto.role ?? Roles.CANDIDATE,
        isActive: false, 
      });
      await this.userRepo.save(user);
    }

    
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    
    await this.cacheManager.set(`otp:${dto.email}`, code, 300000); 

    
    try {
      await this.mailerService.sendMail({
        to: dto.email,
        subject: 'UZ.JOB - Tasdiqlash kodi',
        html: `<h2>Sizning kodingiz: <b style="color:blue; letter-spacing: 4px;">${code}</b></h2><p>Kod 5 daqiqa amal qiladi.</p>`,
      });
    } catch (e) {
      console.log('Mail xatosi:', e);
      
    }

    return successRes({ message: 'Tasdiqlash kodi emailga yuborildi', email: dto.email });
  }

  
  async verifyOtp(email: string, code: string): Promise<ISuccess> {
    
    const storedCode = await this.cacheManager.get(`otp:${email}`);

    if (!storedCode || storedCode !== code) {
      throw new UnauthorizedException('Kod noto\'g\'ri yoki eskirgan');
    }

    
    const user = await this.userRepo.findOne({ where: { email } as any });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    user.isActive = true;
    await this.userRepo.save(user);

    
    await this.cacheManager.del(`otp:${email}`);

    
    const payload: ITokenPayload = { id: user.id, role: user.role, isActive: true };
    const accessToken = await this.tokenService.signAccessToken(payload);
    const refreshToken = await this.tokenService.signRefreshToken(payload);

    return successRes({
      user: { id: user.id, email: user.email, role: user.role, isActive: true },
      accessToken,
      refreshToken,
    });
  }


  async login(dto: LoginDto): Promise<ISuccess> {
    const user = await this.userRepo.findOne({
      where: { email: dto.email } as any,
      select: ['id', 'email', 'passwordHash', 'role', 'isActive'] as any,
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await this.crypto.decrypt(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    if (!user.isActive) throw new UnauthorizedException('User is inactive');

    const payload: ITokenPayload = {
      id: user.id,
      role: user.role,
      isActive: user.isActive,
    };

    const accessToken = await this.tokenService.signAccessToken(payload);
    const refreshToken = await this.tokenService.signRefreshToken(payload);

    return successRes({
      user: { id: user.id, email: user.email, role: user.role },
      accessToken,
      refreshToken,
    });
  }

  async me(currentUser: ITokenPayload): Promise<ISuccess> {
    const user = await this.userRepo.findOne({
      where: { id: currentUser.id } as any,
    });
    if (!user) throw new NotFoundException('User not found');

    return successRes({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        
        firstName: user.firstName,
        phone: user.phone,
        jobTitle: user.jobTitle, 
        city: user.city
      },
    });
  }

  async updateProfile(userId: string, dto: any): Promise<ISuccess> {
    const user = await this.userRepo.findOne({ where: { id: userId } as any });
    if (!user) throw new NotFoundException('User not found');

    
    if (dto.firstName) user.firstName = dto.firstName;
    if (dto.phone) user.phone = dto.phone;
    
    
    if (dto.jobTitle) user.jobTitle = dto.jobTitle;
    if (dto.city) user.city = dto.city;
    
    const savedUser = await this.userRepo.save(user);

    return successRes({
      user: {
        id: savedUser.id,
        email: savedUser.email,
        role: savedUser.role,
        firstName: savedUser.firstName,
        phone: savedUser.phone,
        jobTitle: savedUser.jobTitle,
        city: savedUser.city
      }
    });
  }
  async refresh(refreshToken?: string): Promise<ISuccess> {
    if (!refreshToken) throw new UnauthorizedException('Missing refresh token');

    let payload: ITokenPayload;
    try {
      payload = await this.jwt.verifyAsync<ITokenPayload>(refreshToken, {
        secret: config.JWT.REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.userRepo.findOne({
      where: { id: payload.id } as any,
    });
    if (!user) throw new UnauthorizedException('Invalid refresh token');
    if (!user.isActive) throw new UnauthorizedException('User is inactive');

    const newPayload: ITokenPayload = {
      id: user.id,
      role: user.role,
      isActive: user.isActive,
    };

    const accessToken = await this.tokenService.signAccessToken(newPayload);
    const newRefreshToken = await this.tokenService.signRefreshToken(newPayload);

    return successRes({
      accessToken,
      refreshToken: newRefreshToken,
    });
  }

  logout(): ISuccess {
    return successRes({ message: 'Logged out' });
  }

async forgotPassword(email: string): Promise<ISuccess> {
    const user = await this.userRepo.findOne({ where: { email } as any });
    if (!user) {
      // Xavfsizlik uchun: User topilmasa ham "Yuborildi" deymiz (xakkerlar email borligini bilmasligi uchun)
      return successRes({ message: 'Agar bu email mavjud bo\'lsa, unga link yuborildi.' });
    }

    // Unikal token yaratamiz (bu parol emas, shunchaki kalit)
    const token = uuidv4(); 

    // Redisga yozamiz: "reset:TOKEN" -> "EMAIL" (15 daqiqa yashaydi)
    await this.cacheManager.set(`reset:${token}`, email, 900000); // 15 min

    // Emailga link yuborish
    const resetLink = `http://localhost:3000/reset-password?token=${token}`;

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'UZ.JOB - Parolni tiklash',
        html: `
          <h3>Parolni tiklash so'rovi</h3>
          <p>Siz (yoki kimdir) parolni tiklashni so'radingiz.</p>
          <p>Quyidagi tugmani bosib yangi parol o'rnating:</p>
          <a href="${resetLink}" style="background:blue; color:white; padding:10px 20px; text-decoration:none; border-radius:5px;">Parolni tiklash</a>
          <p>Link 15 daqiqa amal qiladi.</p>
        `,
      });
    } catch (e) {
      console.log('Mail xatosi:', e);
    }

    return successRes({ message: 'Emailga tasdiqlash linki yuborildi' });
  }

  // 2. YANGI PAROLNI SAQLASH LOGIKASI
  async resetPassword(token: string, newPassword: string): Promise<ISuccess> {
    // Redisdan tokenni tekshiramiz
    const email = await this.cacheManager.get<string>(`reset:${token}`);
    
    if (!email) {
      throw new UnauthorizedException('Link eskirgan yoki noto\'g\'ri');
    }

    const user = await this.userRepo.findOne({ where: { email } as any });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    // Yangi parolni shifrlaymiz
    const passwordHash = await this.crypto.encrypt(newPassword);
    user.passwordHash = passwordHash;
    
    await this.userRepo.save(user);

    // Ishlatilgan tokenni o'chirib tashlaymiz
    await this.cacheManager.del(`reset:${token}`);

    return successRes({ message: 'Parol muvaffaqiyatli o\'zgartirildi. Endi yangi parol bilan kiring.' });
  }
}

