import { HttpException } from '@nestjs/common';
import { IResponse } from 'src/interfaces';

export const responseFormatter = (response: IResponse) => {
  if (response.statusCode >= 300) {
    const safeError =
      response.error && typeof response.error === 'object'
        ? {
            code: (response.error as { code?: string }).code,
            message: (response.error as { message?: string }).message,
          }
        : null;

    throw new HttpException(
      {
        statusCode: response.statusCode || 500,
        message: response.message || 'Internal server error',
        data: null,
        errors: safeError,
      },
      response.statusCode || 500,
    );
  }

  return {
    statusCode: response.statusCode || 200,
    message: response.message || 'Success',
    data: response.data || null,
    errors: null,
  };
};
