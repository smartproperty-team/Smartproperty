import { databaseConfig } from './database.config';

describe('databaseConfig', () => {
  const saved = { ...process.env };

  beforeEach(() => {
    process.env = { ...saved };
    delete process.env.MONGODB_URI;
    process.env.MONGODB_USERNAME = 'app_user';
    process.env.MONGODB_PASSWORD = 'from-env';
    process.env.MONGODB_HOST = 'db.internal';
    process.env.MONGODB_PORT = '27018';
    process.env.MONGODB_DATABASE = 'smartproperty_test';
  });

  afterAll(() => {
    process.env = saved;
  });

  it('builds the URI from the MONGODB_* variables', () => {
    expect(databaseConfig().uri).toBe(
      'mongodb://app_user:from-env@db.internal:27018/smartproperty_test?authSource=admin',
    );
  });

  it('prefers MONGODB_URI when it is set', () => {
    process.env.MONGODB_URI = 'mongodb+srv://cluster.example/app';
    expect(databaseConfig().uri).toBe('mongodb+srv://cluster.example/app');
  });

  it('takes credentials only from the environment', () => {
    delete process.env.MONGODB_PASSWORD;
    expect(databaseConfig().password).toBeUndefined();
  });
});
