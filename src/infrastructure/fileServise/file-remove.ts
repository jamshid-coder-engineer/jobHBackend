import { existsSync } from 'fs';
import { unlink } from 'fs/promises';
import { join, normalize } from 'path';
import { config } from 'src/config';

const UPLOAD_ROOT = join(process.cwd(), config.UPLOAD.FOLDER);

export async function removeUploadFileSafe(relativePath?: string | null) {
  if (!relativePath) return;

  const normalized = normalize(relativePath);

  const abs = join(process.cwd(), normalized);
  const absNormalized = normalize(abs);

  if (!absNormalized.startsWith(UPLOAD_ROOT)) {
    return;
  }

  if (existsSync(absNormalized)) {
    try {
      await unlink(absNormalized);
    } catch {}
  }
}
