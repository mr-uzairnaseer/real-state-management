import { NextRequest } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { path: parts } = await ctx.params;
  const fileName = parts.join('/');
  if (fileName.includes('..')) {
    return new Response('Bad request', { status: 400 });
  }
  const dir = process.env.UPLOAD_DIR || 'uploads';
  const abs = path.join(process.cwd(), dir, fileName);
  try {
    const data = await fs.readFile(abs);
    const ext = path.extname(fileName).toLowerCase();
    const type =
      ext === '.png'
        ? 'image/png'
        : ext === '.jpg' || ext === '.jpeg'
          ? 'image/jpeg'
          : ext === '.webp'
            ? 'image/webp'
            : ext === '.svg'
              ? 'image/svg+xml'
              : ext === '.pdf'
                ? 'application/pdf'
                : 'application/octet-stream';
    return new Response(data, {
      headers: {
        'Content-Type': type,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
