import { Module } from '@nestjs/common';
import { LtiService } from './lti.service';
import { LtiController } from './lti.controller';
import { DeepLinkingService } from './deep-linking.service';
import { NrpsService } from './nrps.service';
import { AgsService } from './ags.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [LtiController],
  providers: [LtiService, DeepLinkingService, NrpsService, AgsService],
  exports: [LtiService, DeepLinkingService, NrpsService, AgsService],
})
export class LtiModule {}
