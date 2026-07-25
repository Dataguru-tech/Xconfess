import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from './error-codes';

export interface FeatureNotAvailableResponse {
  message: string;
  code: ErrorCode;
  feature: string;
  available: boolean;
  details?: Record<string, any>;
}

export class FeatureNotAvailableException extends HttpException {
  constructor(
    feature: string,
    message?: string,
    details?: Record<string, any>,
  ) {
    const response: FeatureNotAvailableResponse = {
      message: message || `Feature "${feature}" is currently unavailable`,
      code: ErrorCode.FEATURE_NOT_AVAILABLE,
      feature,
      available: false,
      details,
    };
    super(response, HttpStatus.SERVICE_UNAVAILABLE);
  }

  static fromResponse(response: FeatureNotAvailableResponse): FeatureNotAvailableException {
    return new FeatureNotAvailableException(response.feature, response.message, response.details);
  }
}
