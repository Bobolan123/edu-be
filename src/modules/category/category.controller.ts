import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { CategoryService } from './category.service';
import { Category } from 'src/entities/category.entity';

@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  findAll(): Promise<Category[]> {
    return this.categoryService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Category> {
    return this.categoryService.findOne(id);
  }

  @Post()
  create(@Body() category: Partial<Category>): Promise<Category> {
    return this.categoryService.create(category);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() category: Partial<Category>,
  ): Promise<Category> {
    return this.categoryService.update(id, category);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.categoryService.delete(id);
  }
} 