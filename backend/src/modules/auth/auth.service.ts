import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { UsersService } from '../users/users.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { UserRole } from '../../common/enums/user-role.enum.js';
import { UserStatus } from '../../common/enums/user-status.enum.js';
import { JwtPayload } from './interfaces/jwt-payload.interface.js';
import { User } from '../users/user.entity.js';

const SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  // In-memory reset-token store as a placeholder; swap for a DB table (password_resets) in production.
  private resetTokens = new Map<string, { userId: string; expiresAt: number }>();

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<{ user: Omit<User, 'passwordHash'> }> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.usersService.create({
      name: dto.name,
      mobile: dto.mobile,
      email: dto.email,
      passwordHash,
      address: dto.address,
      city: dto.city,
      area: dto.area,
      organizationName: dto.organizationName,
      role: UserRole.ORGANIZER,
      status: UserStatus.PENDING,
    });

    const { passwordHash: _omit, ...safeUser } = user;
    return { user: safeUser };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    return this.issueTokens(user);
  }

  async refresh(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('Invalid refresh token');
    return this.issueTokens(user);
  }

  logout(): { success: true } {
    // Stateless JWT: client discards tokens. If a refresh-token blacklist table
    // is added later, revoke the token here.
    return { success: true };
  }

  async forgotPassword(email: string): Promise<{ success: true }> {
    const user = await this.usersService.findByEmail(email);
    if (user) {
      const token = randomBytes(32).toString('hex');
      this.resetTokens.set(token, { userId: user.id, expiresAt: Date.now() + 30 * 60 * 1000 });
      // TODO: send token via email/SMS through the notifications module (B22).
    }
    // Always return success to avoid leaking which emails are registered.
    return { success: true };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ success: true }> {
    const entry = this.resetTokens.get(token);
    if (!entry || entry.expiresAt < Date.now()) {
      throw new UnauthorizedException('Reset token is invalid or expired');
    }
    const user = await this.usersService.findById(entry.userId);
    if (!user) throw new UnauthorizedException('Reset token is invalid or expired');

    user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.usersService.create(user);
    this.resetTokens.delete(token);
    return { success: true };
  }

  private issueTokens(user: User) {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get<string>('jwt.accessSecret'),
      expiresIn: this.config.get<string>('jwt.accessExpiry') as `${number}${'s' | 'm' | 'h' | 'd'}`,
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get<string>('jwt.refreshSecret'),
      expiresIn: this.config.get<string>('jwt.refreshExpiry') as `${number}${'s' | 'm' | 'h' | 'd'}`,
    });
    const { passwordHash: _omit, ...safeUser } = user;
    return { accessToken, refreshToken, user: safeUser };
  }
}
