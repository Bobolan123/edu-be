import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from 'src/entities/cart.entity';
import { CartItem } from 'src/entities/cartItem.entity';
import { Course } from 'src/entities/course.entity';
import { User } from 'src/entities/user.entity';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart) private cartRepo: Repository<Cart>,
    @InjectRepository(CartItem) private cartItemRepo: Repository<CartItem>,
    @InjectRepository(Course) private courseRepo: Repository<Course>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async getOrCreateCart(userId: number): Promise<Cart> {
    let cart = await this.cartRepo.findOne({
      where: { user: { id: userId }, isCheckedOut: false },
      relations: ['items', 'items.course'],
    });

    if (!cart) {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user) throw new NotFoundException('User not found');

      cart = this.cartRepo.create({ user, cartItems: [] });
      await this.cartRepo.save(cart);
    }

    return cart;
  }

  async addToCart(userId: number, courseId: number): Promise<Cart> {
    const course = await this.courseRepo.findOne({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');

    const cart = await this.getOrCreateCart(userId);

    const existingItem = await this.cartItemRepo.findOne({
      where: { cart: { id: cart.id }, course: { id: courseId } },
    });

    if (!existingItem) {
      const item = this.cartItemRepo.create({
        cart,
        course,
        price: course.price,
      });
      await this.cartItemRepo.save(item);
    }

    return this.getOrCreateCart(userId);
  }

  async removeFromCart(userId: number, courseId: number): Promise<Cart> {
    const cart = await this.getOrCreateCart(userId);
    const item = await this.cartItemRepo.findOne({
      where: { cart: { id: cart.id }, course: { id: courseId } },
    });

    if (item) {
      await this.cartItemRepo.remove(item);
    }

    return this.getOrCreateCart(userId);
  }

  async clearCart(userId: number): Promise<void> {
    const cart = await this.getOrCreateCart(userId);
    await this.cartItemRepo.delete({ cart: { id: cart.id } });
  }
}
