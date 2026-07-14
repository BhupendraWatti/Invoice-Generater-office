import { Controller, Get, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@Req() req: any) {
    const { passwordHash, ...user } = req.user;
    return user;
  }

  @Put('me/settings')
  async updateSettings(
    @Req() req: any,
    @Body() body: { firstName?: string; lastName?: string; mfaEnabled?: boolean },
  ) {
    return this.usersService.updateUser(req.user.id, body);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  async listUsers() {
    return this.usersService.listAll();
  }

  @Put(':id/role')
  @Roles(UserRole.ADMIN)
  async changeRole(
    @Param('id') id: string,
    @Body() body: { role: UserRole }
  ) {
    return this.usersService.changeRole(id, body.role);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async deleteUser(@Param('id') id: string) {
    return this.usersService.delete(id);
  }
}
