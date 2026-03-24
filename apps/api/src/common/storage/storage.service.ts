import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3 } from 'aws-sdk';

@Injectable()
export class StorageService {
  private readonly s3: S3;
  private readonly bucket: string;

  constructor(private config: ConfigService) {
    this.bucket = this.config.get('S3_BUCKET', 'stupath-avatar');
    this.s3 = new S3({
      endpoint: this.config.get('S3_ENDPOINT'),
      accessKeyId: this.config.get('S3_ACCESS_KEY'),
      secretAccessKey: this.config.get('S3_SECRET_KEY'),
      region: this.config.get('S3_REGION', 'us-east-1'),
      s3ForcePathStyle: true,
    });
  }

  async upload(key: string, body: Buffer | ReadableStream, contentType: string): Promise<string> {
    await this.s3
      .putObject({ Bucket: this.bucket, Key: key, Body: body as any, ContentType: contentType })
      .promise();
    return key;
  }

  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    return this.s3.getSignedUrlPromise('getObject', {
      Bucket: this.bucket,
      Key: key,
      Expires: expiresInSeconds,
    });
  }

  async delete(key: string): Promise<void> {
    await this.s3.deleteObject({ Bucket: this.bucket, Key: key }).promise();
  }
}
