import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(7700),
  API_BASE_URL: Joi.string().uri().optional(),
  CORS_ORIGINS: Joi.string().allow('').optional(),

  MONGODB_URI: Joi.string().required(),

  JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),

  CLOUDINARY_CLOUD_NAME: Joi.string().required(),
  CLOUDINARY_API_KEY: Joi.string().required(),
  CLOUDINARY_API_SECRET: Joi.string().required(),

  CLIENT_ID: Joi.string().required(),
  CLIENT_SECRET: Joi.string().required(),
  REDIRECT_URI: Joi.string().uri().required(),
  REFRESH_TOKEN: Joi.string().required(),
  GMAIL_NAME: Joi.string().email().required(),

  KEEP_ALIVE_URL: Joi.string().uri().optional(),
  KEEP_ALIVE_ENABLED: Joi.boolean().truthy('true').falsy('false').default(true),

  THROTTLE_TTL_MS: Joi.number().positive().default(60000),
  THROTTLE_LIMIT: Joi.number().positive().default(100),

  SWAGGER_ENABLED: Joi.boolean().truthy('true').falsy('false').default(true),
  SWAGGER_PATH: Joi.string().default('docs'),

  SEED_ADMIN_EMAIL: Joi.string().email().optional(),
  SEED_ADMIN_PASSWORD: Joi.string().optional(),
  SEED_SUPER_ADMIN_EMAIL: Joi.string().email().optional(),
  SEED_SUPER_ADMIN_PASSWORD: Joi.string().optional(),
});
