import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  SupportTicket,
  TicketStatus,
} from '../../entities/support-ticket.entity';
import {
  TicketMessage,
  TicketMessageDocument,
} from '../../schemas/ticket-message.schema';
import { Course } from '../../entities/course.entity';
import { User } from '../../entities/user.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';

@Injectable()
export class SupportTicketService {
  constructor(
    @InjectRepository(SupportTicket)
    private ticketRepository: Repository<SupportTicket>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectModel(TicketMessage.name)
    private messageModel: Model<TicketMessageDocument>,
  ) {}

  async createTicket(
    createTicketDto: CreateTicketDto,
    studentId: number,
  ): Promise<SupportTicket> {
    const { subject, courseId } = createTicketDto;

    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['instructor'],
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const student = await this.userRepository.findOne({
      where: { id: studentId },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const ticket = this.ticketRepository.create({
      subject,
      student,
      teacher: course.instructor,
      course,
      status: TicketStatus.OPEN,
    });

    return await this.ticketRepository.save(ticket);
  }

  async getMyTickets(userId: number, role: string): Promise<SupportTicket[]> {
    const whereCondition =
      role === 'instructor' ? { teacher: { id: userId } } : { student: { id: userId } };

    return await this.ticketRepository.find({
      where: whereCondition,
      relations: ['student', 'teacher', 'course'],
      order: { createdAt: 'DESC' },
    });
  }

  async getTicketsByStatus(
    userId: number,
    role: string,
    status: TicketStatus,
  ): Promise<SupportTicket[]> {
    const whereCondition =
      role === 'instructor'
        ? { teacher: { id: userId }, status }
        : { student: { id: userId }, status };

    return await this.ticketRepository.find({
      where: whereCondition,
      relations: ['student', 'teacher', 'course'],
      order: { createdAt: 'DESC' },
    });
  }

  async getTicketById(ticketId: string, userId: number): Promise<SupportTicket> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
      relations: ['student', 'teacher', 'course'],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.student.id !== userId && ticket.teacher.id !== userId) {
      throw new ForbiddenException('You do not have access to this ticket');
    }

    return ticket;
  }

  async sendMessage(
    sendMessageDto: SendMessageDto,
    senderId: number,
    senderRole: string,
  ): Promise<TicketMessage> {
    const { ticketId, message } = sendMessageDto;

    const ticket = await this.getTicketById(ticketId, senderId);

    const savedMessage = await this.messageModel.create({
      ticketId,
      senderId,
      senderRole,
      message,
      isRead: false,
    });

    const newStatus =
      senderRole === 'student'
        ? TicketStatus.WAITING_TEACHER
        : TicketStatus.WAITING_STUDENT;

    await this.ticketRepository.update(ticketId, {
      status: newStatus,
      updatedAt: new Date(),
    });

    return savedMessage;
  }

  async getMessages(ticketId: string, userId: number): Promise<TicketMessage[]> {
    await this.getTicketById(ticketId, userId);

    return await this.messageModel
      .find({ ticketId })
      .sort({ createdAt: 1 })
      .exec();
  }

  async updateTicketStatus(
    ticketId: string,
    updateStatusDto: UpdateTicketStatusDto,
    userId: number,
  ): Promise<SupportTicket> {
    const ticket = await this.getTicketById(ticketId, userId);

    if (ticket.teacher.id !== userId) {
      throw new ForbiddenException('Only the teacher can update ticket status');
    }

    ticket.status = updateStatusDto.status;
    return await this.ticketRepository.save(ticket);
  }

  async markMessagesAsRead(
    ticketId: string,
    userId: number,
  ): Promise<{ modified: number }> {
    await this.getTicketById(ticketId, userId);

    const result = await this.messageModel.updateMany(
      { ticketId, senderId: { $ne: userId }, isRead: false },
      { isRead: true },
    );

    return { modified: result.modifiedCount };
  }

  async getUnreadCount(userId: number, role: string): Promise<number> {
    const tickets = await this.getMyTickets(userId, role);
    const ticketIds = tickets.map((t) => t.id);

    const unreadMessages = await this.messageModel
      .countDocuments({
        ticketId: { $in: ticketIds },
        senderId: { $ne: userId },
        isRead: false,
      })
      .exec();

    return unreadMessages;
  }
}
