import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtModule, JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { AdminGuard } from '../src/auth/admin.guard';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { StepUpGuard } from '../src/auth/step-up.guard';
import { AdminController } from '../src/admin/admin.controller';
import { AdminService } from '../src/admin/services/admin.service';
import { ModerationService } from '../src/admin/services/moderation.service';
import { ModerationTemplateService } from '../src/comment/moderation-template.service';
import { AuditLogService } from '../src/audit-log/audit-log.service';
import { StellarDiagnosticsService } from '../src/admin/services/stellar-diagnostics.service';
import { UserRole } from '../src/user/entities/user.entity';

class FakeJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Unauthorized');
    }

    if (authHeader === 'Bearer admin-token') {
      request.user = { id: 1, userId: 1, role: UserRole.ADMIN };
      return true;
    }

    throw new UnauthorizedException('Unauthorized');
  }
}

describe('Admin Step-Up Re-Authentication (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const adminService = {
    deleteConfession: jest.fn().mockResolvedValue(undefined),
    banUser: jest.fn().mockResolvedValue({ id: 1, username: 'target-user' }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      controllers: [AdminController],
      providers: [
        AdminGuard,
        StepUpGuard,
        { provide: AdminService, useValue: adminService },
        { provide: ModerationService, useValue: {} },
        { provide: ModerationTemplateService, useValue: {} },
        { provide: AuditLogService, useValue: {} },
        { provide: StellarDiagnosticsService, useValue: {} },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(FakeJwtAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    jwtService = moduleFixture.get(JwtService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects a destructive action with no step-up token', async () => {
    await request(app.getHttpServer())
      .delete('/api/admin/confessions/conf-1')
      .set('Authorization', 'Bearer admin-token')
      .send({ reason: 'test' })
      .expect(403)
      .expect(({ body }) => {
        expect(body.code).toBe('AUTH_STEP_UP_REQUIRED');
      });

    expect(adminService.deleteConfession).not.toHaveBeenCalled();
  });

  it('rejects a destructive action with an expired/invalid step-up token', async () => {
    await request(app.getHttpServer())
      .delete('/api/admin/confessions/conf-1')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Step-Up-Token', 'not-a-real-token')
      .send({ reason: 'test' })
      .expect(403)
      .expect(({ body }) => {
        expect(body.code).toBe('AUTH_STEP_UP_EXPIRED');
      });

    expect(adminService.deleteConfession).not.toHaveBeenCalled();
  });

  it('allows a destructive action with a valid, matching step-up token', async () => {
    const stepUpToken = jwtService.sign({ sub: 1, stepUp: true });

    await request(app.getHttpServer())
      .delete('/api/admin/confessions/conf-1')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Step-Up-Token', stepUpToken)
      .send({ reason: 'test' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.message).toBe('Confession deleted successfully');
      });

    expect(adminService.deleteConfession).toHaveBeenCalledTimes(1);
  });

  it('rejects a step-up token belonging to a different user', async () => {
    const stepUpToken = jwtService.sign({ sub: 999, stepUp: true });

    await request(app.getHttpServer())
      .patch('/api/admin/users/2/ban')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Step-Up-Token', stepUpToken)
      .send({ reason: 'test' })
      .expect(403)
      .expect(({ body }) => {
        expect(body.code).toBe('AUTH_STEP_UP_REQUIRED');
      });

    expect(adminService.banUser).not.toHaveBeenCalled();
  });

  afterAll(async () => {
    await app.close();
  });
});