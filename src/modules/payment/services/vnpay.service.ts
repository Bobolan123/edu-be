import { Injectable, Inject } from '@nestjs/common';
import * as crypto from 'crypto';
import * as querystring from 'qs';
import * as moment from 'moment';

interface VNPayConfig {
  vnpay: {
    tmnCode: string;
    hashSecret: string;
    url: string;
    returnUrl: string;
  };
}

@Injectable()
export class VNPayService {
  constructor(
    @Inject('PAYMENT_CONFIG') private readonly config: VNPayConfig
  ) {}

  private sortObject(obj: Record<string, any>) {
    const sorted: Record<string, string> = {};
    const str = Object.keys(obj).sort();
    
    for (const key of str) {
      if (obj.hasOwnProperty(key)) {
        sorted[key] = encodeURIComponent(obj[key]).replace(/%20/g, "+");
      }
    }
    return sorted;
  }

  async createPaymentUrl(orderId: string, amount: number): Promise<string> {
    const date = new Date();
    const createDate = moment(date).format('YYYYMMDDHHmmss');
    
    const tmnCode = this.config.vnpay.tmnCode;
    const secretKey = this.config.vnpay.hashSecret;
    const returnUrl = this.config.vnpay.returnUrl;

    const currCode = 'VND';
    const vnpParams = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: currCode,
      vnp_TxnRef: orderId,
      vnp_OrderInfo: `Thanh toan cho ma GD: ${orderId}`,
      vnp_OrderType: 'other',
      vnp_Amount: (amount * 100).toString(),
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: '127.0.0.1',
      vnp_CreateDate: createDate,
    };

    const sortedParams = this.sortObject(vnpParams);
    const signData = querystring.stringify(sortedParams);
    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
    
    const finalParams = {
      ...vnpParams,
      vnp_SecureHash: signed,
    };

    const vnpUrl = `${this.config.vnpay.url}?${querystring.stringify(finalParams)}`;
    return vnpUrl;
  }

  async verifyReturnUrl(vnpParams: Record<string, any>): Promise<boolean> {
    const secureHash = vnpParams.vnp_SecureHash;
    delete vnpParams.vnp_SecureHash;
    delete vnpParams.vnp_SecureHashType;

    const sortedParams = this.sortObject(vnpParams);
    const signData = querystring.stringify(sortedParams);
    const hmac = crypto.createHmac('sha512', this.config.vnpay.hashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    return secureHash === signed;
  }
} 