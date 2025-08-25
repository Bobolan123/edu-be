import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UseGuards,
  UploadedFile,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserSearchFilterDto } from './dto/user-search-filter.dto';
import { ResponseMessage } from 'src/decorator/responseMessage.decorator';
import { Permissions } from 'src/decorator/requirePermission.decorator';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';

export interface IUpdatePassword {
  id: number;
  password: string;
  newPassword: string;
}
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('')
  @ResponseMessage('Create new User')
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  // @Permissions('view_users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ResponseMessage('View Users')
  @Get('')
  @UsePipes(new ValidationPipe({ transform: true }))
  findAll(@Query() userSearchFilterDto: UserSearchFilterDto) {
    return this.userService.findAll(userSearchFilterDto);
  }

  @ResponseMessage('View one User')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(+id);
  }

  @ResponseMessage('Update User')
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(+id, updateUserDto);
  }

  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Update user password')
  @Patch('password/:id')
  updatePassword(
    @Param('id') id: string,
    @Body() updatePassword: IUpdatePassword,
  ) {
    return this.userService.updatePassword(+id, updatePassword);
  }

  @ResponseMessage('Delete user')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(+id);
  }

  @Post(':id/avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('avatar'))
  @ResponseMessage('Upload user avatar')
  async uploadAvatar(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.userService.uploadAvatar(+id, file);
  }
}
