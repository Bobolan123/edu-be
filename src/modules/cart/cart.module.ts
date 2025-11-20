import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartItem } from 'src/entities/cartItem.entity';
import { Cart } from 'src/entities/cart.entity';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { Course } from 'src/entities/course.entity';
import { User } from 'src/entities/user.entity';
import { Enrollment } from 'src/entities/enrollment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Cart, CartItem, Course, User, Enrollment])],
  exports: [CartService],
  controllers: [CartController],
  providers: [CartService],
})
export class CartModule {}
