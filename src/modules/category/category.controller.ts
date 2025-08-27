import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Query,
  Patch,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { Category } from 'src/entities/category.entity';
import { PageOptionsDto } from 'src/common/dtos/page-option.dto';
import { ResponsePaginate } from 'src/common/dtos/response-paginate.dto';
import { ResponseMessage } from 'src/decorator/responseMessage.decorator';
import { CategoryWithCountDto } from './dto/category-with-count.dto';

@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  @ResponseMessage('Get all categories with course count')
  findAll(
    @Query() pageOptionsDto: PageOptionsDto,
  ): Promise<ResponsePaginate<CategoryWithCountDto>> {
    return this.categoryService.findAll(pageOptionsDto);
  }

  @Get(':id')
  @ResponseMessage('Get category by ID')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Category> {
    return this.categoryService.findOne(id);
  }

  @Post()
  @ResponseMessage('Create new category')
  create(@Body() category: Partial<Category>): Promise<Category> {
    return this.categoryService.create(category);
  }

  @Patch(':id')
  @ResponseMessage('Update category')
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
