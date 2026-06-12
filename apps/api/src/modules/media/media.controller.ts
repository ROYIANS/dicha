import {
  BadRequestException,
  Controller,
  Post,
  Req,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { fromNodeHeaders } from 'better-auth/node';
import type { Request } from 'express';
import { getAuth } from '../auth/auth';
import { AuthGuard } from '../auth/auth.guard';
import { MediaService } from './media.service';

// 头像上传上限 2MB —— 像素头像无需更大，挡住超大图。
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

@Controller('media')
@UseGuards(AuthGuard)
export class MediaController {
  constructor(private readonly media: MediaService) {}

  /**
   * 上传当前用户头像。AuthGuard 已注入 req.user；落盘后用 Better Auth 服务端
   * API 更新该用户 image 列，使会话与 DB 单一身份源保持一致。
   */
  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_AVATAR_BYTES } }),
  )
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: Request,
  ): Promise<{ image: string }> {
    if (!file) {
      throw new BadRequestException('缺少上传文件字段 file');
    }
    if (!this.media.isAllowedImage(file.mimetype)) {
      throw new BadRequestException('仅支持 PNG / JPEG / WebP / GIF 图片');
    }

    const image = await this.media.saveAvatar(file.buffer, file.mimetype);

    // 复用 Better Auth 会话上下文写回 user.image（与 updateUser 等价，服务端可信）。
    const session = await getAuth().api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (!session) {
      throw new UnauthorizedException('Not authenticated');
    }
    await getAuth().api.updateUser({
      body: { image },
      headers: fromNodeHeaders(req.headers),
    });

    return { image };
  }
}
