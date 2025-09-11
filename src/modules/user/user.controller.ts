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
  Request,
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
import { Public } from 'src/auth/Public';

export interface IUpdatePassword {
  id: number;
  password: string;
  newPassword: string;
}
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}
  
  @Get('me')
  @ResponseMessage('Get current user information')
  async getCurrentUser(@Request() req: any) {
    return this.userService.findOne(Number(req.user?.id));
  }

  @Post('')
  @ResponseMessage('Create new User')
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Post('admin')
  @UseInterceptors(FileInterceptor('avatar'))
  @ResponseMessage('Create new User')
  createUserAdmin(
    @Body() createUserDto: CreateUserDto,
    @UploadedFile() avatar?: Express.Multer.File,
  ) {
    return this.userService.createUserAdmin(createUserDto, avatar);
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
  findOne(
    @Param('id') id: string,
    @Query('includeDeleted') includeDeleted?: string,
  ) {
    const includeDeletedBool = includeDeleted === 'true';
    return this.userService.findOne(+id, includeDeletedBool);
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


  @ResponseMessage('Soft delete user')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(+id);
  }

  @ResponseMessage('Restore deleted user')
  @Patch(':id/restore')
  restore(@Param('id') id: string) {
    return this.userService.restore(+id);
  }

  @ResponseMessage('Permanently delete user')
  @Delete(':id/force')
  forceRemove(@Param('id') id: string) {
    return this.userService.forceRemove(+id);
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
