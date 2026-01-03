import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { prisma } from '../../prisma';
import { verifyPassword } from '@prisma/seed';
import { getGlobalConfig } from '../../routerTrpc/config';
import { getNextAuthSecret, generateToken } from '../../lib/helper';
import { cache } from '@shared/lib/cache';

// Cache TTL in milliseconds (20 seconds)
const CACHE_TTL = 20 * 1000;

/**
 * 初始化 JWT 策略
 */
export const initJwtStrategy = async () => {
  const secretKey = await getNextAuthSecret();

  const jwtOptions = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: secretKey,
    passReqToCallback: true,
  };

  passport.use(
    new JwtStrategy(jwtOptions, async (req, jwtPayload, done) => {
      try {
        if (jwtPayload.exp < Math.floor(Date.now() / 1000)) {
          return done(null, false, { message: 'Token expired' });
        }

        const user = await cache.wrap(`user_by_id_${jwtPayload.sub}`, async () => {
          return await prisma.accounts.findUnique({
            where: { id: Number(jwtPayload.sub) },
          });
        }, { ttl: CACHE_TTL });

        if (!user) {
          return done(null, false, { message: 'User not found' });
        }

        if (!jwtPayload.twoFactorVerified) {
          const config = await getGlobalConfig({
            ctx: {
              id: user.id.toString(),
              role: user.role as 'superadmin' | 'user',
              name: user.name,
              sub: user.id.toString(),
              exp: jwtPayload.exp,
              iat: jwtPayload.iat,
            },
          });

          if (config.twoFactorEnabled) {
            return done(null, false, { requiresTwoFactor: true, userId: user.id });
          }
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );
};

/**
 * 初始化本地策略
 */
export const initLocalStrategy = () => {
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'username',
        passwordField: 'password',
      },
      async (username, password, done) => {
        try {
          const users = await cache.wrap(`users_by_name_${username}`, async () => {
            return await prisma.accounts.findMany({
              where: { name: username },
            });
          }, { ttl: CACHE_TTL });

          if (users.length === 0) {
            return done(null, false, { message: 'User not found' });
          }

          const correctUsers = await Promise.all(
            users.map(async (user) => {
              if (await verifyPassword(password, user.password ?? '')) {
                return user;
              }
            })
          );

          const user = correctUsers.find((u) => u !== undefined);

          if (!user) {
            return done(null, false, { message: 'Incorrect password' });
          }

          const config = await getGlobalConfig({
            ctx: {
              id: user.id.toString(),
              role: user.role as 'superadmin' | 'user',
              name: user.name,
              sub: user.id.toString(),
              exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60 * 1000,
              iat: Math.floor(Date.now() / 1000),
            },
          });

          if (config.twoFactorEnabled) {
            return done(null, false, { requiresTwoFactor: true, userId: user.id });
          }

          const token = await generateToken(user, false);

          return done(null, { ...user, token });
        } catch (error) {
          return done(error);
        }
      }
    )
  );
};
