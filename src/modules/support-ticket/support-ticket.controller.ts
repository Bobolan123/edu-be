import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SupportTicketService } from './support-ticket.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ResponseMessage } from '../../decorator/responseMessage.decorator';
import { TicketStatus } from '../../entities/support-ticket.entity';

@Controller('support-tickets')
@UseGuards(JwtAuthGuard)
export class SupportTicketController {
  constructor(private readonly supportTicketService: SupportTicketService) {}

  @Post()
  @ResponseMessage('Ticket created successfully')
  async createTicket(@Body() createTicketDto: CreateTicketDto, @Request() req) {
    return await this.supportTicketService.createTicket(
      createTicketDto,
      req.user.id,
    );
  }

  @Get('admin/all')
  @ResponseMessage('All tickets retrieved successfully')
  async getAllTickets(
    @Query('page') page?: number,
    @Query('take') take?: number,
    @Query('search') search?: string,
    @Query('status') status?: TicketStatus,
  ) {
    return await this.supportTicketService.getAllTicketsForAdmin({
      page: page ? Number(page) : 1,
      take: take ? Number(take) : 10,
      search,
      status,
    });
  }

  @Get()
  @ResponseMessage('Tickets retrieved successfully')
  async getMyTickets(@Request() req, @Query('status') status?: TicketStatus) {
    const userRole = req.user.role || 'student';
    if (status) {
      return await this.supportTicketService.getTicketsByStatus(
        req.user.id,
        userRole,
        status,
      );
    }

    return await this.supportTicketService.getMyTickets(req.user.id, userRole);
  }

  @Get('unread-count')
  @ResponseMessage('Unread count retrieved successfully')
  async getUnreadCount(@Request() req) {
    const userRole = req.user.role || 'student';
    return await this.supportTicketService.getUnreadCount(req.user.id, userRole);
  }

  @Get(':id')
  @ResponseMessage('Ticket details retrieved successfully')
  async getTicketById(@Param('id') id: string, @Request() req) {
    return await this.supportTicketService.getTicketById(id, req.user.id);
  }

  @Get(':id/messages')
  @ResponseMessage('Messages retrieved successfully')
  async getMessages(@Param('id') id: string, @Request() req) {
    return await this.supportTicketService.getMessages(id, req.user.id);
  }

  @Post(':id/messages')
  @ResponseMessage('Message sent successfully')
  async sendMessage(
    @Param('id') id: string,
    @Body() sendMessageDto: SendMessageDto,
    @Request() req,
  ) {
    const userRole = req.user.role || 'student';
    return await this.supportTicketService.sendMessage(
      sendMessageDto,
      req.user.id,
      userRole,
    );
  }

  @Patch(':id/status')
  @ResponseMessage('Ticket status updated successfully')
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateTicketStatusDto,
    @Request() req,
  ) {
    return await this.supportTicketService.updateTicketStatus(
      id,
      updateStatusDto,
      req.user.id,
    );
  }

  @Patch(':id/read')
  @ResponseMessage('Messages marked as read')
  async markAsRead(@Param('id') id: string, @Request() req) {
    return await this.supportTicketService.markMessagesAsRead(
      id,
      req.user.id,
    );
  }
}
