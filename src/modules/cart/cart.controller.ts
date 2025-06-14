import {
    Controller,
    Post,
    Delete,
    Get,
    Param,
    Req,
    UseGuards,
  } from '@nestjs/common';
  import { CartService } from './cart.service';
  import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
  import { Request } from 'express';
  import { User } from 'src/entities/user.entity';
  
  interface RequestWithUser extends Request {
    user: User;
  }
  
  @Controller('cart')
  @UseGuards(JwtAuthGuard)
  export class CartController {
    constructor(private readonly cartService: CartService) {}
  
    @Get()
    async getCart(@Req() req: RequestWithUser) {
      return this.cartService.getOrCreateCart(req.user.id);
    }
  
    @Post(':courseId')
    async addToCart(
      @Param('courseId') courseId: string,
      @Req() req: RequestWithUser,
    ) {
      return this.cartService.addToCart(req.user.id, Number(courseId));
    }
  
    @Delete(':courseId')
    async removeFromCart(
      @Param('courseId') courseId: string,
      @Req() req: RequestWithUser,
    ) {
      return this.cartService.removeFromCart(req.user.id, Number(courseId));
    }
  }
  