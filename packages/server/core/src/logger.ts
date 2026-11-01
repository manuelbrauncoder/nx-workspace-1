import { pino } from 'pino';
import { config } from './config';

export const logger = pino({
  level: config.logLevel,
  // pino-http logs all headers; the session cookie would let anyone with the logs sign in
  redact: ['req.headers.cookie', 'res.headers["set-cookie"]'],
  ...(config.nodeEnv === 'development' && { transport: { target: 'pino-pretty' } }),
});
