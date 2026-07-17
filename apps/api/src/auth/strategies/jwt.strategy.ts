import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../../prisma/prisma.service";

export type JwtPayload = {
  sub: string;
  role: string;
  restaurantId: string | null;
};

export type AuthUser = {
  id: string;
  email: string;
  role: string;
  restaurantId: string | null;
  branchIds: string[];
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>("JWT_ACCESS_SECRET"),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        restaurantId: true,
        status: true,
        managedBranches: { select: { id: true } },
      },
    });

    if (!user || user.status !== "ACTIVE") {
      throw new UnauthorizedException("Account is inactive or not found");
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      restaurantId: user.restaurantId,
      branchIds: user.managedBranches.map((b) => b.id),
    };
  }
}
