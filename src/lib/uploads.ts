import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

export async function saveUpload(file: File): Promise<{ url: string; fileName: string; mimeType: string }> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name) || '.bin';
  const fileName = `${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
  const dir = process.env.UPLOAD_DIR || 'uploads';
  const abs = path.join(process.cwd(), dir);
  await fs.mkdir(abs, { recursive: true });
  await fs.writeFile(path.join(abs, fileName), bytes);
  return {
    url: `/uploads/${fileName}`,
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
  };
}

export async function saveDataUrl(dataUrl: string, originalName = 'file.bin') {
  if (!dataUrl.startsWith('data:')) {
    return { url: dataUrl, fileName: originalName, mimeType: 'application/octet-stream' };
  }
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) {
    return { url: dataUrl, fileName: originalName, mimeType: 'application/octet-stream' };
  }
  const mimeType = match[1];
  const buf = Buffer.from(match[2], 'base64');
  const ext =
    mimeType.includes('png')
      ? '.png'
      : mimeType.includes('jpeg') || mimeType.includes('jpg')
        ? '.jpg'
        : mimeType.includes('webp')
          ? '.webp'
          : mimeType.includes('pdf')
            ? '.pdf'
            : mimeType.includes('svg')
              ? '.svg'
              : '.bin';
  const fileName = `${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
  const dir = process.env.UPLOAD_DIR || 'uploads';
  const abs = path.join(process.cwd(), dir);
  await fs.mkdir(abs, { recursive: true });
  await fs.writeFile(path.join(abs, fileName), buf);
  return { url: `/uploads/${fileName}`, fileName: originalName, mimeType };
}
