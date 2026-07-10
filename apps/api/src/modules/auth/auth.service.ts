import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { AuthResponseDto } from '@docflow/shared-types';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(pass, user.passwordHash))) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(email: string, pass: string): Promise<AuthResponseDto> {
    const user = await this.validateUser(email, pass);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.mfaEnabled) {
      const mfaToken = this.jwtService.sign(
        { sub: user.id, email: user.email, isPendingMfa: true },
        { expiresIn: '5m' },
      );
      return {
        status: 'MFA_REQUIRED',
        mfaToken,
      };
    }

    const payload = { email: user.email, sub: user.id };
    const token = this.jwtService.sign(payload);
    return {
      status: 'SUCCESS',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        mfaEnabled: user.mfaEnabled,
        createdAt: user.createdAt.toISOString(),
      },
    };
  }
}
