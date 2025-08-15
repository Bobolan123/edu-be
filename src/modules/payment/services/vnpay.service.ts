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
  constructor(@Inject('PAYMENT_CONFIG') private readonly config: VNPayConfig) {}

  sortObject(obj: any): any {
    const sorted: any = {};
    const keys = Object.keys(obj).sort();
    keys.forEach((key) => {
      sorted[key] = obj[key];
    });
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
      vnp_Amount: amount * 100,
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: '127.0.0.1',
      vnp_CreateDate: createDate,
    };

    // Sort and append parameters to URLSearchParams
    const redirectUrl = new URL(this.config.vnpay.url);
    const searchParams = new URLSearchParams();

    Object.entries(vnpParams)
      .sort(([key1], [key2]) => key1.localeCompare(key2))
      .forEach(([key, value]) => {
        if (value !== '' && value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });

    // Generate secure hash
    const signData = searchParams.toString();
    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    searchParams.append('vnp_SecureHash', signed);
    redirectUrl.search = searchParams.toString();

    return redirectUrl.toString();
  }

  verifyReturnUrl(params: Record<string, string>): { isValid: boolean; isSuccess: boolean } {
    const receivedSecureHash = params.vnp_SecureHash;
    const responseCode = params.vnp_ResponseCode;
    const transactionStatus = params.vnp_TransactionStatus;
    
    // Create a copy for hash verification
    const paramsForHash = { ...params };
    delete paramsForHash.vnp_SecureHash;
    delete paramsForHash.vnp_SecureHashType;

    const sortedParams = Object.keys(paramsForHash)
      .sort()
      .reduce(
        (acc, key) => {
          acc[key] = paramsForHash[key];
          return acc;
        },
        {} as Record<string, string>,
      );

    // Convert to query string WITHOUT encoding
    const signData = new URLSearchParams(sortedParams).toString();

    const secretKey = this.config.vnpay.hashSecret;
    const generatedHash = crypto
      .createHmac('sha512', secretKey)
      .update(signData, 'utf-8')
      .digest('hex');

    const isValid = receivedSecureHash === generatedHash;
    // VNPay response codes: 00 = success, 24 = cancelled by user, others = failed
    const isSuccess = isValid && responseCode === '00' && transactionStatus === '00';

    return { isValid, isSuccess };
  }
}
