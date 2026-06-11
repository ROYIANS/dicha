import {
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { authContract } from '@vidorra/shared';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('login')
  async login(@Req() req: Request, @Res() res: Response): Promise<void> {
    const loginUrl = await this.authService.buildLoginUrl(req.session);
    res.redirect(loginUrl);
  }

  @Get('callback')
  async callback(@Req() req: Request, @Res() res: Response): Promise<void> {
    const error = req.query.error;
    if (error) {
      return res.redirect(`/login?error=${encodeURIComponent(error as string)}`);
    }

    try {
      const currentUrl = new URL(
        req.originalUrl,
        `${req.protocol}://${req.get('host')}`,
      );

      const user = await this.authService.handleCallback(req.session, currentUrl);
      req.session.user = user;

      delete req.session.pkceVerifier;
      delete req.session.nonce;
      delete req.session.state;

      res.redirect('/');
    } catch (err) {
      console.error('Callback error:', err);
      res.redirect('/login?error=callback_failed');
    }
  }

  @TsRestHandler(authContract.getMe)
  @UseGuards(AuthGuard)
  async getMe(@Req() req: Request) {
    return tsRestHandler(authContract.getMe, async () => {
      const user = req.session.user;
      if (!user) {
        throw new UnauthorizedException('Not authenticated');
      }
      return { status: 200 as const, body: user };
    });
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  async logout(@Req() req: Request, @Res() res: Response): Promise<void> {
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
      }
      res.clearCookie('connect.sid');
      res.status(200).json({ message: 'Logged out' });
    });
  }
}
