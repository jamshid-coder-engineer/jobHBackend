import { HttpException, HttpStatus } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { config } from 'src/config';

export const CV_DESTINATION = join(
  process.cwd(),
  config.UPLOAD.FOLDER || 'uploads',
  'cv',
);

const ensureCvDir = () => {
  if (!existsSync(CV_DESTINATION)) {
    mkdirSync(CV_DESTINATION, { recursive: true });
  }
};

export const pdfMulterOptions = {
  storage: diskStorage({
    destination: (req, file, cb) => {
      ensureCvDir();
      cb(null, CV_DESTINATION);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, `cv-${uniqueSuffix}${extname(file.originalname)}`);
    },
  }),
  fileFilter: (req: any, file: any, cb: any) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(
        new HttpException(
          `Only PDF files are allowed!`,
          HttpStatus.BAD_REQUEST,
        ),
        false,
      );
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
};