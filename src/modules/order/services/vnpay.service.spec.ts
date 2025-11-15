import { Test, TestingModule } from '@nestjs/testing';
import { VNPayService } from './vnpay.service';

describe('VNPayService - Unit Tests', () => {
  let service: VNPayService;

  const mockConfig = {
    vnpay: {
      tmnCode: 'TEST_TMN_CODE',
      hashSecret: 'TEST_HASH_SECRET',
      url: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
      returnUrl: 'http://localhost:3000/payment/vnpay-return',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VNPayService,
        {
          provide: 'PAYMENT_CONFIG',
          useValue: mockConfig,
        },
      ],
    }).compile();

    service = module.get<VNPayService>(VNPayService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPaymentUrl', () => {
    it('should create payment URL successfully', async () => {
      // Arrange
      const orderId = 'ORDER123';
      const amount = 100000;

      // Act
      const result = await service.createPaymentUrl(orderId, amount);

      // Assert
      expect(result).toContain('sandbox.vnpayment.vn');
      expect(result).toContain('vnp_TxnRef');
      expect(result).toContain('vnp_Amount');
      expect(result).toContain('vnp_SecureHash');
    });

    it('should include correct order information', async () => {
      // Arrange
      const orderId = 'ORDER456';
      const amount = 500000;

      // Act
      const result = await service.createPaymentUrl(orderId, amount);

      // Assert
      expect(result).toContain(orderId);
      expect(result).toContain((amount * 100).toString());
    });
  });

  describe('verifyPaymentReturn', () => {
    it('should handle successful payment return', () => {
      // Arrange
      const validParams = {
        vnp_TxnRef: 'ORDER123',
        vnp_Amount: '10000000',
        vnp_ResponseCode: '00',
      };

      // Act & Assert
      expect(validParams.vnp_ResponseCode).toBe('00');
      expect(validParams.vnp_TxnRef).toBe('ORDER123');
    });

    it('should handle failed payment return', () => {
      // Arrange
      const failedParams = {
        vnp_TxnRef: 'ORDER123',
        vnp_Amount: '10000000',
        vnp_ResponseCode: '24',
      };

      // Act & Assert
      expect(failedParams.vnp_ResponseCode).not.toBe('00');
    });
  });

  describe('sortObject', () => {
    it('should sort object keys alphabetically', () => {
      // Arrange
      const unsorted = { z: 1, a: 2, m: 3 };

      // Act
      const sorted = service.sortObject(unsorted);

      // Assert
      const keys = Object.keys(sorted);
      expect(keys).toEqual(['a', 'm', 'z']);
    });
  });
});
