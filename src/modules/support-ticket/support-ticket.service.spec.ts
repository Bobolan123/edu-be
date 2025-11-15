import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getModelToken } from '@nestjs/mongoose';
import { Repository } from 'typeorm';
import { Model } from 'mongoose';
import { NotFoundException } from '@nestjs/common';
import { SupportTicketService } from './support-ticket.service';
import { SupportTicket, TicketStatus } from '../../entities/support-ticket.entity';
import { TicketMessage } from '../../schemas/ticket-message.schema';
import { Course } from '../../entities/course.entity';
import { User } from '../../entities/user.entity';

describe('SupportTicketService - Unit Tests', () => {
  let service: SupportTicketService;
  let ticketRepository: Repository<SupportTicket>;
  let courseRepository: Repository<Course>;
  let userRepository: Repository<User>;
  let messageModel: Model<TicketMessage>;

  const mockStudent = {
    id: 1,
    email: 'student@example.com',
    name: 'Student User',
  };

  const mockInstructor = {
    id: 2,
    email: 'instructor@example.com',
    name: 'Instructor User',
  };

  const mockCourse = {
    id: 1,
    title: 'React Course',
    instructor: mockInstructor,
  };

  const mockTicket = {
    id: 1,
    subject: 'Question about useState',
    student: mockStudent,
    instructor: mockInstructor,
    course: mockCourse,
    status: TicketStatus.OPEN,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupportTicketService,
        {
          provide: getRepositoryToken(SupportTicket),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Course),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getModelToken(TicketMessage.name),
          useValue: {
            create: jest.fn(),
            find: jest.fn(),
            countDocuments: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SupportTicketService>(SupportTicketService);
    ticketRepository = module.get<Repository<SupportTicket>>(
      getRepositoryToken(SupportTicket),
    );
    courseRepository = module.get<Repository<Course>>(getRepositoryToken(Course));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    messageModel = module.get<Model<TicketMessage>>(
      getModelToken(TicketMessage.name),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTicket', () => {
    it('should create support ticket successfully', async () => {
      // Arrange
      const createTicketDto = {
        subject: 'Question about React Hooks',
        courseId: 1,
      };

      jest.spyOn(courseRepository, 'findOne').mockResolvedValue(mockCourse as any);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockStudent as any);
      jest.spyOn(ticketRepository, 'create').mockReturnValue(mockTicket as any);
      jest.spyOn(ticketRepository, 'save').mockResolvedValue(mockTicket as any);

      // Act
      const result = await service.createTicket(createTicketDto as any, 1);

      // Assert
      expect(result).toEqual(mockTicket);
      expect(result.status).toBe(TicketStatus.OPEN);
      expect(ticketRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when course not found', async () => {
      // Arrange
      const createTicketDto = {
        subject: 'Question',
        courseId: 999,
      };

      jest.spyOn(courseRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.createTicket(createTicketDto as any, 1),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.createTicket(createTicketDto as any, 1),
      ).rejects.toThrow('Course not found');
    });

    it('should throw NotFoundException when student not found', async () => {
      // Arrange
      const createTicketDto = {
        subject: 'Question',
        courseId: 1,
      };

      jest.spyOn(courseRepository, 'findOne').mockResolvedValue(mockCourse as any);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.createTicket(createTicketDto as any, 999),
      ).rejects.toThrow('Student not found');
    });
  });

  describe('sendMessage', () => {
    it('should send message successfully', async () => {
      // Arrange
      const sendMessageDto = {
        ticketId: 1,
        message: 'Can you explain useState hook?',
      };

      const mockMessage = {
        _id: 'msg-1',
        ticketId: 1,
        senderId: 1,
        senderRole: 'student',
        message: sendMessageDto.message,
        isRead: false,
        createdAt: new Date(),
      };

      jest.spyOn(service, 'getTicketById' as any).mockResolvedValue(mockTicket);
      jest.spyOn(messageModel, 'create').mockResolvedValue(mockMessage as any);

      // Act
      const result = await service.sendMessage(sendMessageDto as any, 1, 'student');

      // Assert
      expect(result).toEqual(mockMessage);
      expect(messageModel.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when ticket not found', async () => {
      // Arrange
      const sendMessageDto = {
        ticketId: 999,
        message: 'Test message',
      };

      jest.spyOn(service, 'getTicketById' as any).mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.sendMessage(sendMessageDto as any, 1, 'student'),
      ).rejects.toThrow('Ticket not found');
    });
  });

  describe('getMessages', () => {
    it('should return messages for a ticket', async () => {
      // Arrange
      const ticketId = '1';
      const userId = 1;
      const mockMessages = [
        {
          _id: 'msg-1',
          ticketId: '1',
          senderId: 1,
          senderRole: 'student',
          message: 'Hello',
          isRead: false,
          createdAt: new Date(),
        },
        {
          _id: 'msg-2',
          ticketId: '1',
          senderId: 2,
          senderRole: 'instructor',
          message: 'Hi, how can I help?',
          isRead: false,
          createdAt: new Date(),
        },
      ];

      jest.spyOn(service, 'getTicketById' as any).mockResolvedValue(mockTicket);
      jest.spyOn(messageModel, 'find').mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockMessages),
      } as any);

      // Act
      const result = await service.getMessages(ticketId, userId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].senderRole).toBe('student');
      expect(result[1].senderRole).toBe('instructor');
    });
  });
});
