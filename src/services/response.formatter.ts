import { HttpException } from '@nestjs/common';
import { IResponse } from 'src/interfaces';

export const responseFormatter = (response: IResponse) => {
  if (response.statusCode >= 300) {
    throw new HttpException(
      {
        message: response.message,
        data: null,
        errors: response.error,
      },
      response.statusCode,
    );
  }

  return {
    message: response.message,
    data: response.data,
    errors: null,
  };
};
