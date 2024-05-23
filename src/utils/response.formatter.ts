import { HttpException } from '@nestjs/common';
import { IResponse } from 'src/interfaces';

export const responseFormatter = (response: IResponse) => {
  if (response.statusCode >= 300) {
    throw new HttpException(
      {
        statusCode: response.statusCode || 500,
        message: response.message || 'Internal server error', // Default message if not provided
        data: null,
        errors: response.error || null,
      },
      response.statusCode || 500,
    );
  }

  return {
    statusCode: response.statusCode || 200, // Default to 200 if statusCode is not provided
    message: response.message || 'Success', // Default message if not provided
    data: response.data || null,
    errors: null,
  };
};
