import { Injectable } from '@nestjs/common';
import { UploadApiErrorResponse, UploadApiResponse, v2 } from 'cloudinary';
import toStream = require('buffer-to-stream');

@Injectable()
export class CloudinaryService {
  async upload(
    file: Express.Multer.File,
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    if (!file || !file.buffer) {
      return Promise.reject('File or buffer is undefined');
    }

    return new Promise((resolve, reject) => {
      const upload = v2.uploader.upload_stream((error, result) => {
        if (error) return reject(error);
        return resolve(result);
      });

      toStream(file.buffer).pipe(upload);
    });
  }

  async delete(publicId: string) {
    return v2.uploader.destroy(publicId);
  }
}
