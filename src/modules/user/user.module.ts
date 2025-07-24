import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { Role } from 'src/entities/role.entity';
import { RoleService } from '../role/role.service';
import { Subscription } from 'src/entities/subscription.entity';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { Cart } from 'src/entities/cart.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role, Subscription, Cart]),
    CloudinaryModule,
  ],
  exports: [UserService],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
