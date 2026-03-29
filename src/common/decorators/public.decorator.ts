import { SetMetadata } from '@nestjs/common';
import { AUTH_CONSTANTS } from 'src/constants/auth.constants';

export const Public = () => SetMetadata(AUTH_CONSTANTS.IS_PUBLIC_KEY, true);
