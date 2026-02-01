import { existsSync } from 'fs';
import { unlink } from 'fs/promises';
import { join, normalize, isAbsolute } from 'path';
import { config } from 'src/config';

const UPLOAD_ROOT = join(process.cwd(), config.UPLOAD.FOLDER || 'uploads');

export async function removeUploadFileSafe(relativePath?: string | null) {
  if (!relativePath) return;

  try {
    // Agar yo'l allaqachon absolyut bo'lsa yoki uploads bilan boshlansa
    const fullPath = isAbsolute(relativePath) 
      ? relativePath 
      : join(process.cwd(), relativePath);

    const normalizedPath = normalize(fullPath);

    // Xavfsizlik: faqat uploads papkasi ichidagi fayllarni o'chirishga ruxsat
    if (!normalizedPath.startsWith(UPLOAD_ROOT)) {
      console.warn('Security alert: Attempt to delete file outside upload directory');
      return;
    }

    if (existsSync(normalizedPath)) {
      await unlink(normalizedPath);
    }
  } catch (error) {
    console.error(`File removal error: ${error.message}`);
  }
}