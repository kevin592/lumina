import passport from 'passport';
import { initJwtStrategy, initLocalStrategy } from './authStrategies';
import { initOAuthStrategies, reinitializeOAuthStrategies } from './authOAuth';

/**
 * 配置会话和认证策略
 */
export const configureSession = async (app: any) => {
  await initJwtStrategy();
  initLocalStrategy();
  await initOAuthStrategies();

  app.use(passport.initialize());
};

// Re-export OAuth functions
export { reinitializeOAuthStrategies };

export default passport;
