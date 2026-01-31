import { existsSync } from 'fs';
import { unlink } from 'fs/promises';
import { join, normalize } from 'path';
import { config } from 'src/config';

const UPLOAD_ROOT = join(process.cwd(), config.UPLOAD.FOLDER);

export async function removeUploadFileSafe(relativePath?: string | null) {
  if (!relativePath) return;

  // normalize: "uploads/../x" kabi path traversal bo‘lmasin
  const normalized = normalize(relativePath);

  // faqat uploads ichidan o‘chiramiz
  const abs = join(process.cwd(), normalized);
  const absNormalized = normalize(abs);

  if (!absNormalized.startsWith(UPLOAD_ROOT)) {
    // xavfsizlik: uploads tashqarisini o‘chirmaymiz
    return;
  }

  if (existsSync(absNormalized)) {
    try {
      await unlink(absNormalized);
    } catch {
      // o‘chmasa ham crash qilmaymiz (prod’da ham shunday qilinadi)
    }
  }
}
