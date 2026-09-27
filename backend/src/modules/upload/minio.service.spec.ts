// ===========================================
// MinioService unit tests - public and private buckets
// ===========================================

import { Client } from 'minio';

import { MinioService } from './minio.service';

jest.mock('minio', () => ({ Client: jest.fn() }));

describe('MinioService', () => {
  const client = {
    bucketExists: jest.fn(),
    makeBucket: jest.fn(),
    setBucketPolicy: jest.fn(),
    putObject: jest.fn(),
    presignedGetObject: jest.fn(async () => 'https://signed.example/link'),
    removeObject: jest.fn(),
  };
  (Client as unknown as jest.Mock).mockImplementation(() => client);

  const settings: Record<string, unknown> = {
    'minio.bucketName': 'photos',
    'minio.privateBucketName': 'documents',
    'minio.publicUrl': 'https://pub.example',
    'minio.publicUrlIncludesBucket': false,
    'minio.privateUrlExpiry': 600,
  };
  const build = () =>
    new MinioService({ get: jest.fn((key: string) => settings[key]) } as any);

  const file = (name: string, mimetype: string) =>
    ({
      originalname: name,
      mimetype,
      size: 4,
      buffer: Buffer.from('data'),
    }) as Express.Multer.File;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates missing buckets and makes only the photo bucket public', async () => {
    client.bucketExists.mockResolvedValue(false);

    await build().onModuleInit();

    expect(client.makeBucket).toHaveBeenCalledWith('photos');
    expect(client.makeBucket).toHaveBeenCalledWith('documents');
    expect(client.setBucketPolicy).toHaveBeenCalledTimes(1);
    expect(client.setBucketPolicy).toHaveBeenCalledWith(
      'photos',
      expect.stringContaining('arn:aws:s3:::photos/*'),
    );
  });

  it('leaves buckets that already exist alone', async () => {
    client.bucketExists.mockResolvedValue(true);

    await build().onModuleInit();

    expect(client.makeBucket).not.toHaveBeenCalled();
    expect(client.setBucketPolicy).not.toHaveBeenCalled();
  });

  it('keeps private uploads in the private bucket, with no URL', async () => {
    const pdf = file('payslip.pdf', 'application/pdf');

    const stored = await build().uploadPrivateFile(pdf, {
      folder: 'verification/u1/proof_of_income',
    });

    expect(client.putObject).toHaveBeenCalledWith(
      'documents',
      stored.key,
      pdf.buffer,
      pdf.size,
      expect.objectContaining({ 'Content-Type': 'application/pdf' }),
    );
    expect(stored.key).toMatch(/^verification\/u1\/proof_of_income\/.+\.pdf$/);
    expect(stored).not.toHaveProperty('url');
  });

  it('still gives public uploads a public URL', async () => {
    const uploaded = await build().uploadFile(file('a.webp', 'image/webp'), {
      folder: 'properties/p1',
    });

    expect(client.putObject.mock.calls[0][0]).toBe('photos');
    expect(uploaded.url).toBe(`https://pub.example/${uploaded.key}`);
  });

  it('signs private links for ten minutes unless told otherwise', async () => {
    const service = build();

    await service.getPrivateFileUrl('verification/u1/identity/id.jpg');
    await service.getPrivateFileUrl('verification/u1/identity/id.jpg', 60);

    expect(client.presignedGetObject).toHaveBeenNthCalledWith(
      1,
      'documents',
      'verification/u1/identity/id.jpg',
      600,
    );
    expect(client.presignedGetObject).toHaveBeenNthCalledWith(
      2,
      'documents',
      'verification/u1/identity/id.jpg',
      60,
    );
  });

  it('deletes private files from the private bucket', async () => {
    await build().deletePrivateFile('verification/u1/identity/id.jpg');

    expect(client.removeObject).toHaveBeenCalledWith(
      'documents',
      'verification/u1/identity/id.jpg',
    );
  });
});
