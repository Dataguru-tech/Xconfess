import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';
import { FeatureNotAvailableException } from '../../common/errors/feature-not-available.exception';

@Injectable()
export class StellarFeatureGuard implements CanActivate {
  constructor(
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const configEnabled = this.configService.get<string>('STELLAR_ENABLED', 'true');
    
    if (configEnabled !== 'true') {
      throw new FeatureNotAvailableException(
        'stellar',
        'Stellar mode is disabled',
        { reason: 'config_disabled' },
      );
    }

    const flagEnabled = await this.featureFlagsService.isEnabled('stellar_enabled');
    
    if (!flagEnabled) {
      throw new FeatureNotAvailableException(
        'stellar',
        'Stellar feature flag is disabled',
        { reason: 'feature_flag_disabled' },
      );
    }

    return true;
  }
}
