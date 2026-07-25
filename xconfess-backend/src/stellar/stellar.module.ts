import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StellarConfigService } from './stellar-config.service';
import { TransactionBuilderService } from './transaction-builder.service';
import { StellarService } from './stellar.service';
import { ContractService } from './contract.service';
import { StellarController } from './stellar.controller';
import { StellarInvokeContractGuard } from './guards/stellar-invoke-contract.guard';
import { StellarFeatureGuard } from './guards/stellar-feature.guard';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { DeploymentMetadataService } from './services/deployment-metadata.service';
import { StellarReconciliationWorker } from './stellar-reconciliation.worker';
import { StellarAnchor } from './entities/stellar-anchor.entity';
import { AnonymousConfession } from '../confession/entities/confession.entity';
import { FeatureFlagsModule } from '../feature-flags/feature-flags.module';

@Module({
  imports: [
    ConfigModule,
    FeatureFlagsModule,
    AuditLogModule,
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([StellarAnchor, AnonymousConfession]),
  ],
  providers: [
    StellarConfigService,
    TransactionBuilderService,
    StellarService,
    ContractService,
    StellarInvokeContractGuard,
    StellarFeatureGuard,
    DeploymentMetadataService,
    StellarReconciliationWorker,
  ],
  controllers: [StellarController],
  exports: [
    StellarConfigService,
    TransactionBuilderService,
    StellarService,
    ContractService,
    DeploymentMetadataService,
    StellarFeatureGuard,
  ],
})
export class StellarModule {}
