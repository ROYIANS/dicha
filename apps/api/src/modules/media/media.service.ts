import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** 允许的图片 MIME → 落盘扩展名。 */
const EXT_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

@Injectable()
export class MediaService {
  constructor(private readonly config: ConfigService) {}

  /** 绝对化的上传根目录（容器内由卷挂载持久化）。 */
  uploadRoot(): string {
    return resolve(this.config.get<string>('UPLOAD_DIR', './uploads'));
  }

  isAllowedImage(mimetype: string): boolean {
    return mimetype in EXT_BY_MIME;
  }

  /**
   * 将头像二进制写入 uploads/avatars/<uuid>.<ext>，返回对外可访问的相对 URL。
   * URL 走 /api/uploads/* —— 与 nginx 同源 /api/ 反代对齐，无需额外存储服务。
   */
  async saveAvatar(buffer: Buffer, mimetype: string): Promise<string> {
    const ext = EXT_BY_MIME[mimetype];
    const dir = join(this.uploadRoot(), 'avatars');
    await mkdir(dir, { recursive: true });
    const filename = `${randomUUID()}.${ext}`;
    await writeFile(join(dir, filename), buffer);
    return `/api/uploads/avatars/${filename}`;
  }
}
