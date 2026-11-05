export const rateLimitConfigurations = {
  DELETE_ACCOUNT_RATE_LIMIT: {
    key: 'delete-account',
    max: 5,
    windowMs: 15 * 60 * 1000,
  },
};
