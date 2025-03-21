import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
  refreshToken: {
    secret: process.env.REFRESH_TOKEN_SECRET || 'your-refresh-secret-key',
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  },
})); 