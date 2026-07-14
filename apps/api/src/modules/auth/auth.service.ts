import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { AuditService } from '../audit/audit.service';
import * as bcrypt from 'bcrypt';
import { AuthResponseDto } from '@docflow/shared-types';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(pass, user.passwordHash))) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(email: string, pass: string, ip?: string, ua?: string): Promise<AuthResponseDto> {
    const user = await this.validateUser(email, pass);
    if (!user) {
      await this.auditService.logAction(null, 'LOGIN_FAILED', `Failed login attempt for ${email}`, ip, ua);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.mfaEnabled) {
      await this.auditService.logAction(user.id, 'MFA_CHALLENGE', `MFA challenge prompted for ${email}`, ip, ua);
      const mfaToken = this.jwtService.sign(
        { sub: user.id, email: user.email, isPendingMfa: true },
        { expiresIn: '5m' },
      );
      return {
        status: 'MFA_REQUIRED',
        mfaToken,
      };
    }

    await this.auditService.logAction(user.id, 'LOGIN_SUCCESS', `User ${email} successfully logged in`, ip, ua);
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

  async verifyMfa(mfaToken: string, code: string, ip?: string, ua?: string): Promise<AuthResponseDto> {
    try {
      const payload = this.jwtService.verify(mfaToken);
      if (!payload.isPendingMfa) {
        throw new UnauthorizedException('Invalid MFA token');
      }

      const user = await this.usersService.findById(payload.sub);
      if (!user || !user.mfaSecret) {
        throw new UnauthorizedException('MFA not set up for this user');
      }

      const isValid = verifyTotp(user.mfaSecret, code);
      if (!isValid) {
        throw new UnauthorizedException('Invalid verification code');
      }

      await this.auditService.logAction(user.id, 'LOGIN_SUCCESS_MFA', `User ${user.email} logged in with MFA`, ip, ua);
      const finalPayload = { email: user.email, sub: user.id };
      const token = this.jwtService.sign(finalPayload);
      
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
    } catch (err: any) {
      throw new UnauthorizedException(err.message || 'MFA verification failed');
    }
  }
}

// Decode base32 string to buffer
function base32Decode(base32: string): Buffer {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = base32.toUpperCase().replace(/=+$/, '');
  let bits = '';
  for (let i = 0; i < clean.length; i++) {
    const val = chars.indexOf(clean.charAt(i));
    if (val === -1) throw new Error('Invalid base32 character');
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

// Verify TOTP token (6 digits, 30s window, skew of +/- 1 window)
function verifyTotp(secret: string, token: string): boolean {
  try {
    const crypto = require('crypto');
    const key = base32Decode(secret);
    const epoch = Math.floor(Date.now() / 1000);
    const currentCounter = Math.floor(epoch / 30);

    for (let offset = -1; offset <= 1; offset++) {
      const counterVal = currentCounter + offset;
      const buffer = Buffer.alloc(8);
      let temp = BigInt(counterVal);
      for (let i = 7; i >= 0; i--) {
        buffer[i] = Number(temp & BigInt(0xff));
        temp >>= BigInt(8);
      }

      const hmac = crypto.createHmac('sha1', key);
      hmac.update(buffer);
      const hmacResult = hmac.digest();

      const codeOffset = hmacResult[hmacResult.length - 1] & 0xf;
      const binary =
        ((hmacResult[codeOffset] & 0x7f) << 24) |
        ((hmacResult[codeOffset + 1] & 0xff) << 16) |
        ((hmacResult[codeOffset + 2] & 0xff) << 8) |
        (hmacResult[codeOffset + 3] & 0xff);

      const otp = (binary % 1000000).toString().padStart(6, '0');
      if (otp === token) {
        return true;
      }
    }
  } catch (err) {
    console.error('TOTP verification error:', err);
  }
  return false;
}
