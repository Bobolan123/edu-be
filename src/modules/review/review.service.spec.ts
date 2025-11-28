import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ReviewService } from './review.service';
import { Review } from 'src/entities/review.entity';
import { Course } from 'src/entities/course.entity';
import { User } from 'src/entities/user.entity';
import { ReviewVote, VoteType } from 'src/entities/review-vote.entity';
import { ReviewSortBy } from './dto/review-filter.dto';

describe('ReviewService - Unit Tests', () => {
  let service: ReviewService;
  let reviewRepository: Repository<Review>;
  let courseRepository: Repository<Course>;
  let userRepository: Repository<User>;
  let reviewVoteRepository: Repository<ReviewVote>;

  const mockUser: Partial<User> = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
  };

  const mockCourse: Partial<Course> = {
    id: 1,
    title: 'Test Course',
    description: 'Test Description',
  };

  const mockReview: Partial<Review> = {
    id: 1,
    user: mockUser as User,
    course: mockCourse as Course,
    rating: 5,
    comment: 'Great course!',
    date_reviewed: new Date('2024-01-01'),
    upVotes: 0,
    downVotes: 0,
  };

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    getRawOne: jest.fn(),
    getRawMany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewService,
        {
          provide: getRepositoryToken(Review),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(Course),
          useValue: {
            findOne: jest.fn(),
            findOneBy: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            findOneBy: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ReviewVote),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ReviewService>(ReviewService);
    reviewRepository = module.get<Repository<Review>>(
      getRepositoryToken(Review),
    );
    courseRepository = module.get<Repository<Course>>(
      getRepositoryToken(Course),
    );
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    reviewVoteRepository = module.get<Repository<ReviewVote>>(
      getRepositoryToken(ReviewVote),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findOne', () => {
    it('should return review when found', async () => {
      jest
        .spyOn(reviewRepository, 'findOne')
        .mockResolvedValue(mockReview as Review);

      const result = await service.findOne(1);

      expect(result).toEqual(mockReview);
      expect(reviewRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['user', 'course'],
      });
    });

    it('should return null when review not found', async () => {
      jest.spyOn(reviewRepository, 'findOne').mockResolvedValue(null);

      const result = await service.findOne(999);

      expect(result).toBeNull();
    });
  });

  describe('createReview', () => {
    it('should create review successfully', async () => {
      const createDto = {
        userId: 1,
        courseId: 1,
        rating: 5,
        comment: 'Great course!',
      };

      jest
        .spyOn(userRepository, 'findOneBy')
        .mockResolvedValue(mockUser as User);
      jest
        .spyOn(courseRepository, 'findOneBy')
        .mockResolvedValue(mockCourse as Course);
      jest.spyOn(reviewRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(reviewRepository, 'create')
        .mockReturnValue(mockReview as Review);
      jest
        .spyOn(reviewRepository, 'save')
        .mockResolvedValue(mockReview as Review);

      const result = await service.createReview(createDto);

      expect(result).toEqual(mockReview);
      expect(reviewRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if user not found', async () => {
      const createDto = {
        userId: 999,
        courseId: 1,
        rating: 5,
        comment: 'Great course!',
      };

      jest.spyOn(userRepository, 'findOneBy').mockResolvedValue(null);
      jest
        .spyOn(courseRepository, 'findOneBy')
        .mockResolvedValue(mockCourse as Course);

      await expect(service.createReview(createDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createReview(createDto)).rejects.toThrow(
        'User or Course not found',
      );
    });

    it('should throw BadRequestException if course not found', async () => {
      const createDto = {
        userId: 1,
        courseId: 999,
        rating: 5,
        comment: 'Great course!',
      };

      jest
        .spyOn(userRepository, 'findOneBy')
        .mockResolvedValue(mockUser as User);
      jest.spyOn(courseRepository, 'findOneBy').mockResolvedValue(null);

      await expect(service.createReview(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if review already exists', async () => {
      const createDto = {
        userId: 1,
        courseId: 1,
        rating: 5,
        comment: 'Great course!',
      };

      jest
        .spyOn(userRepository, 'findOneBy')
        .mockResolvedValue(mockUser as User);
      jest
        .spyOn(courseRepository, 'findOneBy')
        .mockResolvedValue(mockCourse as Course);
      jest
        .spyOn(reviewRepository, 'findOne')
        .mockResolvedValue(mockReview as Review);

      await expect(service.createReview(createDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createReview(createDto)).rejects.toThrow(
        'Review already exists for this course',
      );
    });
  });

  describe('updateReview', () => {
    it('should update review successfully', async () => {
      const updateDto = {
        rating: 4,
        comment: 'Updated comment',
      };
      const updatedReview = { ...mockReview, ...updateDto };

      jest
        .spyOn(reviewRepository, 'findOne')
        .mockResolvedValue(mockReview as Review);
      jest
        .spyOn(reviewRepository, 'save')
        .mockResolvedValue(updatedReview as Review);

      const result = await service.updateReview(1, updateDto);

      expect(result.rating).toBe(4);
      expect(result.comment).toBe('Updated comment');
      expect(reviewRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException when review not found', async () => {
      jest.spyOn(reviewRepository, 'findOne').mockResolvedValue(null);

      await expect(service.updateReview(999, {})).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.updateReview(999, {})).rejects.toThrow(
        'Review not found',
      );
    });

    it('should update date_reviewed when rating or comment changes', async () => {
      const updateDto = { rating: 3 };
      const originalDate = new Date('2024-01-01');
      const reviewWithDate = { ...mockReview, date_reviewed: originalDate };

      jest
        .spyOn(reviewRepository, 'findOne')
        .mockResolvedValue(reviewWithDate as Review);
      jest.spyOn(reviewRepository, 'save').mockImplementation(async (review) => {
        return review as Review;
      });

      const result = await service.updateReview(1, updateDto);

      expect(result.date_reviewed).not.toEqual(originalDate);
    });
  });

  describe('delete', () => {
    it('should delete review successfully', async () => {
      jest.spyOn(reviewRepository, 'delete').mockResolvedValue(undefined);

      await service.delete(1);

      expect(reviewRepository.delete).toHaveBeenCalledWith(1);
    });
  });

  describe('findByCourse', () => {
    it('should return paginated reviews for a course', async () => {
      const filterDto = {
        page: 1,
        take: 10,
        skip: 0,
        order: 'DESC' as any,
        orderBy: 'date_reviewed',
      };

      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockReview], 1]);

      const result = await service.findByCourse(1, filterDto);

      expect(result.result).toEqual([mockReview]);
      expect(result.meta).toBeDefined();
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'course.id = :courseId',
        { courseId: 1 },
      );
    });
  });

  describe('findUserCourseReview', () => {
    it('should return review when user has reviewed the course', async () => {
      jest
        .spyOn(reviewRepository, 'findOne')
        .mockResolvedValue(mockReview as Review);

      const result = await service.findUserCourseReview(1, 1);

      expect(result).toEqual(mockReview);
      expect(reviewRepository.findOne).toHaveBeenCalledWith({
        where: {
          user: { id: 1 },
          course: { id: 1 },
        },
        relations: ['user', 'course'],
      });
    });

    it('should return null when user has not reviewed the course', async () => {
      jest.spyOn(reviewRepository, 'findOne').mockResolvedValue(null);

      const result = await service.findUserCourseReview(1, 1);

      expect(result).toBeNull();
    });
  });

  describe('voteOnReview', () => {
    it('should create new upvote successfully', async () => {
      const mockVote: Partial<ReviewVote> = {
        id: 1,
        user: mockUser as User,
        review: mockReview as Review,
        voteType: VoteType.UP,
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(mockReview as Review);
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(mockUser as User);
      jest.spyOn(reviewVoteRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(reviewVoteRepository, 'create')
        .mockReturnValue(mockVote as ReviewVote);
      jest
        .spyOn(reviewVoteRepository, 'save')
        .mockResolvedValue(mockVote as ReviewVote);
      jest
        .spyOn(reviewRepository, 'save')
        .mockResolvedValue({ ...mockReview, upVotes: 1 } as Review);

      const result = await service.voteOnReview(1, 1, VoteType.UP);

      expect(result.review.upVotes).toBe(1);
      expect(result.userVote).toEqual(mockVote);
    });

    it('should toggle off existing vote when voting same type', async () => {
      const existingVote: Partial<ReviewVote> = {
        id: 1,
        voteType: VoteType.UP,
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(mockReview as Review);
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(mockUser as User);
      jest
        .spyOn(reviewVoteRepository, 'findOne')
        .mockResolvedValue(existingVote as ReviewVote);
      jest.spyOn(reviewVoteRepository, 'remove').mockResolvedValue(undefined);
      jest
        .spyOn(reviewRepository, 'save')
        .mockResolvedValue({ ...mockReview, upVotes: -1 } as Review);

      const result = await service.voteOnReview(1, 1, VoteType.UP);

      expect(result.userVote).toBeNull();
      expect(reviewVoteRepository.remove).toHaveBeenCalledWith(existingVote);
    });

    it('should switch vote from up to down', async () => {
      const existingVote: Partial<ReviewVote> = {
        id: 1,
        voteType: VoteType.UP,
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(mockReview as Review);
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(mockUser as User);
      jest
        .spyOn(reviewVoteRepository, 'findOne')
        .mockResolvedValue(existingVote as ReviewVote);
      jest
        .spyOn(reviewVoteRepository, 'save')
        .mockResolvedValue({ ...existingVote, voteType: VoteType.DOWN } as ReviewVote);
      jest
        .spyOn(reviewRepository, 'save')
        .mockResolvedValue({ ...mockReview, upVotes: -1, downVotes: 1 } as Review);

      const result = await service.voteOnReview(1, 1, VoteType.DOWN);

      expect(result.userVote.voteType).toBe(VoteType.DOWN);
      expect(result.review.upVotes).toBe(-1);
      expect(result.review.downVotes).toBe(1);
    });

    it('should throw NotFoundException when review not found', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(null);

      await expect(service.voteOnReview(999, 1, VoteType.UP)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockReview as Review);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.voteOnReview(1, 999, VoteType.UP)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getUserVoteOnReview', () => {
    it('should return user vote when exists', async () => {
      const mockVote: Partial<ReviewVote> = {
        id: 1,
        voteType: VoteType.UP,
      };

      jest
        .spyOn(reviewVoteRepository, 'findOne')
        .mockResolvedValue(mockVote as ReviewVote);

      const result = await service.getUserVoteOnReview(1, 1);

      expect(result).toEqual(mockVote);
    });

    it('should return null when user has not voted', async () => {
      jest.spyOn(reviewVoteRepository, 'findOne').mockResolvedValue(null);

      const result = await service.getUserVoteOnReview(1, 1);

      expect(result).toBeNull();
    });
  });

  describe('addOrUpdateReview', () => {
    it('should create new review if not exists', async () => {
      jest
        .spyOn(userRepository, 'findOneBy')
        .mockResolvedValue(mockUser as User);
      jest
        .spyOn(courseRepository, 'findOne')
        .mockResolvedValue(mockCourse as Course);
      jest.spyOn(reviewRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(reviewRepository, 'create')
        .mockReturnValue(mockReview as Review);
      jest
        .spyOn(reviewRepository, 'save')
        .mockResolvedValue(mockReview as Review);

      const result = await service.addOrUpdateReview(1, 1, 5, 'Great!');

      expect(result).toEqual(mockReview);
      expect(reviewRepository.create).toHaveBeenCalled();
    });

    it('should update existing review', async () => {
      const existingReview = { ...mockReview, rating: 3 };
      const updatedReview = { ...mockReview, rating: 5 };

      jest
        .spyOn(userRepository, 'findOneBy')
        .mockResolvedValue(mockUser as User);
      jest
        .spyOn(courseRepository, 'findOne')
        .mockResolvedValue(mockCourse as Course);
      jest
        .spyOn(reviewRepository, 'findOne')
        .mockResolvedValue(existingReview as Review);
      jest
        .spyOn(reviewRepository, 'save')
        .mockResolvedValue(updatedReview as Review);

      const result = await service.addOrUpdateReview(1, 1, 5);

      expect(result.rating).toBe(5);
      expect(reviewRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if user or course not found', async () => {
      jest.spyOn(userRepository, 'findOneBy').mockResolvedValue(null);
      jest.spyOn(courseRepository, 'findOne').mockResolvedValue(null);

      await expect(service.addOrUpdateReview(999, 999, 5)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getAverageRating', () => {
    it('should return average rating', async () => {
      mockQueryBuilder.getRawOne.mockResolvedValue({ avg: '4.5' });

      const result = await service.getAverageRating(1);

      expect(result).toBe(4.5);
    });

    it('should return 0 when no reviews exist', async () => {
      mockQueryBuilder.getRawOne.mockResolvedValue({ avg: null });

      const result = await service.getAverageRating(1);

      expect(result).toBe(0);
    });
  });

  describe('getRatingDistribution', () => {
    it('should return rating distribution', async () => {
      jest.spyOn(reviewRepository, 'count').mockResolvedValue(10);
      mockQueryBuilder.getRawMany.mockResolvedValue([
        { rating: 5, count: 6 },
        { rating: 4, count: 3 },
        { rating: 3, count: 1 },
      ]);
      mockQueryBuilder.getRawOne.mockResolvedValue({ avg: '4.5' });

      const result = await service.getRatingDistribution(1);

      expect(result.total_reviews).toBe(10);
      expect(result.average_rating).toBe(4.5);
      expect(result.distribution).toHaveLength(5);
      expect(result.distribution[0].stars).toBe(5);
      expect(result.distribution[4].stars).toBe(1);
    });

    it('should handle empty distribution', async () => {
      jest.spyOn(reviewRepository, 'count').mockResolvedValue(0);
      mockQueryBuilder.getRawMany.mockResolvedValue([]);
      mockQueryBuilder.getRawOne.mockResolvedValue({ avg: null });

      const result = await service.getRatingDistribution(1);

      expect(result.total_reviews).toBe(0);
      expect(result.average_rating).toBe(0);
      expect(result.distribution.every((d) => d.count === 0)).toBe(true);
    });
  });

  describe('findAll', () => {
    it('should return paginated reviews with filters', async () => {
      const filterDto = {
        page: 1,
        take: 10,
        skip: 0,
        order: 'DESC' as any,
        orderBy: 'date_reviewed',
        rating: 5,
        sortBy: ReviewSortBy.NEWEST,
      };

      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockReview], 1]);

      const result = await service.findAll(filterDto);

      expect(result.result).toEqual([mockReview]);
      expect(result.meta).toBeDefined();
    });
  });
});
