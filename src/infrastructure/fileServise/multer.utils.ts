import { HttpException, HttpStatus } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { config } from 'src/config';

// Rasmlar uchun alohida papka
export const IMG_DESTINATION = join(
  process.cwd(),
  config.UPLOAD.FOLDER || 'uploads',
  'images',
);

const ensureImgDir = () => {
  if (!existsSync(IMG_DESTINATION)) {
    mkdirSync(IMG_DESTINATION, { recursive: true });
  }
};

export const multerOptions = {
  storage: diskStorage({
    destination: (req, file, cb) => {
      ensureImgDir(); // Faqat kerak bo'lganda papkani tekshiradi
      cb(null, IMG_DESTINATION);
    },
    filename: (req, file, cb) => {
      // Fayl nomini yanada xavfsizroq va noyob qilish (timestamp + random)
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, `img-${uniqueSuffix}${extname(file.originalname)}`);
    },
  }),

  fileFilter: (req: any, file: any, cb: any) => {
    // Faqat rasm formatlarini qabul qilish
    if (file.mimetype.match(/\/(jpg|jpeg|png|webp|svg\+xml)$/)) {
      cb(null, true);
    } else {
      cb(
        new HttpException(
          `Unsupported file type ${extname(file.originalname)}. Use JPG, PNG, WEBP or SVG.`,
          HttpStatus.BAD_REQUEST,
        ),
        false,
      );
    }
  },

  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit - rasmlar uchun yetarli
  },
};