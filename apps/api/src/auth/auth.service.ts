import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { UserRole } from "@prisma/client";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;
const RESET_TOKEN_EXPIRY_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  // ─── Login ───────────────────────────────────────────────────────────────

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { managedBranches: { select: { id: true } } },
    });

    if (!user || user.status === "ARCHIVED") {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (user.status === "INACTIVE") {
      throw new ForbiddenException(
        "Your account is pending approval by an administrator",
      );
    }

    // Check account lock (FR-AUTH-07)
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 60000,
      );
      throw new ForbiddenException(
        `Account temporarily locked. Try again in ${minutesLeft} minute(s).`,
      );
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);

    if (!passwordMatch) {
      const attempts = user.failedLoginAttempts + 1;
      const shouldLock = attempts >= MAX_LOGIN_ATTEMPTS;

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: attempts,
          lockedUntil: shouldLock ? new Date(Date.now() + LOCK_DURATION_MS) : undefined,
        },
      });

      if (shouldLock) {
        throw new ForbiddenException(
          `Too many failed attempts. Account locked for 15 minutes.`,
        );
      }

      throw new UnauthorizedException("Invalid credentials");
    }

    // Successful login — reset counters
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    const tokens = await this.issueTokens(user.id, user.role, user.restaurantId);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        restaurantId: user.restaurantId,
        branchIds: user.managedBranches.map((b) => b.id),
      },
    };
  }

  // ─── Register (restaurant self-signup, pending approval) ─────────────────

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (exists) {
      throw new ConflictException("An account with this email already exists");
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const result = await this.prisma.$transaction(async (tx) => {
      const restaurant = await tx.restaurant.create({
        data: {
          legalName: dto.legalName,
          displayName: dto.displayName,
          status: "INACTIVE", // Pending Super Admin approval
        },
      });

      const user = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          role: UserRole.RESTAURANT_ADMIN,
          restaurantId: restaurant.id,
          status: "INACTIVE", // Pending approval
        },
      });

      return { restaurant, user };
    });

    return {
      message:
        "Registration submitted. Your account will be active after admin approval.",
      restaurantId: result.restaurant.id,
    };
  }

  // ─── Refresh Token (FR-AUTH-03) ───────────────────────────────────────────

  async refresh(rawToken: string) {
    const hashedToken = this.hashToken(rawToken);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: hashedToken },
      include: {
        user: { select: { id: true, role: true, restaurantId: true, status: true } },
      },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    // Refresh token reuse detection — possible token theft
    if (stored.usedAt) {
      await this.prisma.refreshToken.deleteMany({
        where: { userId: stored.userId },
      });
      throw new UnauthorizedException(
        "Refresh token already used. All sessions invalidated for security.",
      );
    }

    if (stored.user.status !== "ACTIVE") {
      throw new UnauthorizedException("Account is no longer active");
    }

    // Rotate: mark old as used, issue new pair
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { usedAt: new Date() },
    });

    return this.issueTokens(
      stored.user.id,
      stored.user.role,
      stored.user.restaurantId,
    );
  }

  // ─── Logout (FR-AUTH-04) ─────────────────────────────────────────────────

  async logout(rawToken: string) {
    const hashedToken = this.hashToken(rawToken);

    await this.prisma.refreshToken.deleteMany({
      where: { token: hashedToken },
    });
  }

  // ─── Forgot Password (FR-AUTH-06) ────────────────────────────────────────

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    // Always return success — never reveal if email exists (prevents enumeration)
    if (!user || user.status !== "ACTIVE") return;

    // Delete any previous unused reset tokens
    await this.prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    });

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = this.hashToken(rawToken);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: hashedToken,
        expiresAt: new Date(Date.now() + RESET_TOKEN_EXPIRY_MS),
      },
    });

    await this.mail.sendPasswordReset(user.email, rawToken);
  }

  // ─── Reset Password ───────────────────────────────────────────────────────

  async resetPassword(dto: ResetPasswordDto) {
    const hashedToken = this.hashToken(dto.token);

    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token: hashedToken },
    });

    if (
      !resetToken ||
      resetToken.expiresAt < new Date() ||
      resetToken.usedAt !== null
    ) {
      throw new BadRequestException("Invalid or expired password reset link");
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      // Invalidate all active sessions after password change
      this.prisma.refreshToken.deleteMany({
        where: { userId: resetToken.userId },
      }),
    ]);
  }

  // ─── Change Password ──────────────────────────────────────────────────────

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException("User not found");

    const passwordMatch = await bcrypt.compare(dto.currentPassword, user.passwordHash);

    if (!passwordMatch) {
      throw new UnauthorizedException("Current password is incorrect");
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { message: "Password changed successfully" };
  }

  // ─── Get Current User ─────────────────────────────────────────────────────

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        restaurantId: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        managedBranches: { select: { id: true, name: true } },
      },
    });

    if (!user) throw new NotFoundException("User not found");

    return user;
  }

  // ─── Internal: Create User (used by Restaurant/SuperAdmin modules) ────────

  async createUser(data: {
    email: string;
    password: string;
    role: UserRole;
    restaurantId?: string;
  }) {
    const exists = await this.prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (exists) {
      throw new ConflictException("An account with this email already exists");
    }

    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

    return this.prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        role: data.role,
        restaurantId: data.restaurantId ?? null,
        status: "ACTIVE",
      },
      select: {
        id: true,
        email: true,
        role: true,
        restaurantId: true,
        status: true,
        createdAt: true,
      },
    });
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private async issueTokens(
    userId: string,
    role: UserRole,
    restaurantId: string | null,
  ) {
    const payload = { sub: userId, role, restaurantId };

    const accessToken = this.jwt.sign(payload, {
      secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"),
      expiresIn: this.config.get<string>("JWT_ACCESS_EXPIRES_IN", "15m"),
    });

    const rawRefreshToken = crypto.randomBytes(40).toString("hex");

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token: this.hashToken(rawRefreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
      },
    });

    return { accessToken, refreshToken: rawRefreshToken };
  }

  private hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }
}
