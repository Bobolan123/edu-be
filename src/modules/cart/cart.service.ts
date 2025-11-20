import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from 'src/entities/cart.entity';
import { CartItem } from 'src/entities/cartItem.entity';
import { Course } from 'src/entities/course.entity';
import { User } from 'src/entities/user.entity';
import { Enrollment } from 'src/entities/enrollment.entity';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart) private cartRepo: Repository<Cart>,
    @InjectRepository(CartItem) private cartItemRepo: Repository<CartItem>,
    @InjectRepository(Course) private courseRepo: Repository<Course>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Enrollment) private enrollmentRepo: Repository<Enrollment>,
  ) {}

  async getOrCreateCart(userId: number): Promise<Cart> {
    let cart = await this.cartRepo.findOne({
      where: { user: { id: userId }, isCheckedOut: false },
      relations: ['cartItems', 'cartItems.course'],
      withDeleted: false,
    });

    if (!cart) {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user) throw new NotFoundException('User not found');

      cart = this.cartRepo.create({ user, cartItems: [] });
      await this.cartRepo.save(cart);
    }

    // Filter out cart items with deleted courses or courses already enrolled in
    if (cart.cartItems) {
      const validItems = [];
      const itemsToRemove = [];

      for (const item of cart.cartItems) {
        // Check if course is deleted
        if (!item.course || item.course.deleted_at) {
          itemsToRemove.push(item);
          continue;
        }

        // Check if user is already enrolled in this course
        const enrollment = await this.enrollmentRepo.findOne({
          where: { student: { id: userId }, course: { id: item.course.id } },
        });

        if (enrollment) {
          itemsToRemove.push(item);
        } else {
          validItems.push(item);
        }
      }

      // Remove invalid items from database
      if (itemsToRemove.length > 0) {
        await this.cartItemRepo.remove(itemsToRemove);
      }

      cart.cartItems = validItems;
    }

    return cart;
  }

  async addToCart(userId: number, courseId: number): Promise<Cart> {
    const course = await this.courseRepo.findOne({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');

    // Check if user is already enrolled in this course
    const existingEnrollment = await this.enrollmentRepo.findOne({
      where: { student: { id: userId }, course: { id: courseId } },
    });

    if (existingEnrollment) {
      throw new BadRequestException('You are already enrolled in this course');
    }

    const cart = await this.getOrCreateCart(userId);

    const existingItem = await this.cartItemRepo.findOne({
      where: { cart: { id: cart.id }, course: { id: courseId } },
    });

    if (existingItem) {
      throw new BadRequestException('Course is already in the cart');
    }

    const newItem = this.cartItemRepo.create({
      cart,
      course,
      price: course.price,
    });
    await this.cartItemRepo.save(newItem);

    // Return the updated cart state
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
