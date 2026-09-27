import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'app.port') return 3000;
              if (key === 'app.name') return 'SmartProperty API';
              if (key === 'app.nodeEnv') return 'test';
              return undefined;
            },
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return API info', () => {
      const result = appController.getApiInfo();
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('description');
    });
  });

  describe('health', () => {
    const saved = process.env.GIT_COMMIT;
    afterEach(() => {
      if (saved === undefined) delete process.env.GIT_COMMIT;
      else process.env.GIT_COMMIT = saved;
    });

    it('reports the commit the image was built from', () => {
      process.env.GIT_COMMIT = 'abc1234';
      expect(appController.getHealth()).toMatchObject({
        status: 'ok',
        commit: 'abc1234',
      });
    });

    it('says unknown when the build did not record one', () => {
      delete process.env.GIT_COMMIT;
      expect(appController.getHealth().commit).toBe('unknown');
    });
  });
});
