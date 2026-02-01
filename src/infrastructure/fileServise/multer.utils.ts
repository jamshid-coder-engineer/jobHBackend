import { HttpException, HttpStatus } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { config } from 'src/config';

export const UPLOAD_DESTINATION = join(
  process.cwd(),
  config.UPLOAD.FOLDER || 'uploads',
);

export const createDestination = () => {
  if (!existsSync(UPLOAD_DESTINATION)) {
    mkdirSync(UPLOAD_DESTINATION, { recursive: true });
  }
};

export const multerOptions = {
  storage: diskStorage({
    destination: (req, file, cb) => {
      createDestination();
      cb(null, UPLOAD_DESTINATION);
    },
    filename: (req, file, cb) => {
      const randomName = Array(32)
        .fill(null)
        .map(() => Math.floor(Math.random() * 16).toString(16))
        .join('');

      cb(null, `${randomName}${extname(file.originalname)}`);
    },
  }),

  fileFilter: (req: any, file: any, cb: any) => {
    if (file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
      cb(null, true);
    } else {
      cb(
        new HttpException(
          `Unsupported file type ${extname(file.originalname)}`,
          HttpStatus.BAD_REQUEST,
        ),
        false,
      );
    }
  },

  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
};
