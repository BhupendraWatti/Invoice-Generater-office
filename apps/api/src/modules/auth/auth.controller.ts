import { Controller, Post, Body, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthResponseDto } from '@docflow/shared-types';
import { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: { email: string; pass: string },
    @Req() req: Request,
  ): Promise<AuthResponseDto> {
    const ip = req.ip || '';
    const ua = (req.headers['user-agent'] as string) || '';
    return this.authService.login(body.email, body.pass, ip, ua);
  }
}
