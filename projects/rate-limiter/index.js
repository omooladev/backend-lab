import { rateLimitConfigurations } from './constants/security.js';
import { checkRateLimit} from './lib/security.js';

const userId = '12345';

const testRateLimit = async (rateLimitConfiguration) => {
  const { key, ...rest } = rateLimitConfiguration;
  const rateLimit = await checkRateLimit(`${key}:${userId}`, rest);
};

try {
  await testRateLimit(rateLimitConfigurations.DELETE_ACCOUNT_RATE_LIMIT);
} catch (error) {
  console.log('An error has occurred', error);
}
