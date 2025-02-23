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
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResponseMessage } from 'src/decorator/responseMessage.decorator';
import { Permissions } from 'src/decorator/requirePermission.decorator';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

export interface IUpdatePassword {
  password:string
  newPassword:string
}
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('')
  @ResponseMessage('Create new User')
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Permissions('view_users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ResponseMessage('View Users')
  @Get('')
  findAll() {
    return this.userService.findAll();
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

  @ResponseMessage('Update user password')
  @Patch(':id')
  updatePassword(@Param('id') id: string, @Body() updateUserDto: IUpdatePassword) {
    return this.userService.updatePassword(+id, updateUserDto);
  }

  @ResponseMessage('Delete user')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(+id);
  }
}
