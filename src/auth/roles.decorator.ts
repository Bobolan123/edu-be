import { Reflector } from '@nestjs/core';
import { Role } from 'src/common/constants';

export const Roles = Reflector.createDecorator<Role[]>();
