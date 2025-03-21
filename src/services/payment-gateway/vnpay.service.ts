import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import * as querystring from 'qs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class VNPayService {
  constructor(private configService: ConfigService) {}

  createPaymentUrl(orderId: string, amount: number, ipAddr: string): string {
    const tmnCode = this.configService.get('VNPAY_TMN_CODE');
    const secretKey = this.configService.get('VNPAY_HASH_SECRET');
    const vnpUrl = this.configService.get('VNPAY_URL');
    const returnUrl = this.configService.get('VNPAY_RETURN_URL');

    const date = new Date();
    const createDate = date.toISOString().split('T')[0].split('-').join('') + 
                      date.toTimeString().split(' ')[0].split(':').join('');

    const currCode = 'VND';
    const vnp_Params = {
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
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate,
    };

    const sortedParams = this.sortObject(vnp_Params);
    const signData = querystring.stringify(sortedParams, { encode: false });
    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(new Buffer(signData, 'utf-8')).digest('hex');
    
    sortedParams['vnp_SecureHash'] = signed;
    const finalUrl = `${vnpUrl}?${querystring.stringify(sortedParams, { encode: false })}`;
    
    return finalUrl;
  }

  verifyReturnUrl(vnpParams: any): boolean {
    const secretKey = this.configService.get('VNPAY_HASH_SECRET');
    const secureHash = vnpParams['vnp_SecureHash'];

    delete vnpParams['vnp_SecureHash'];
    delete vnpParams['vnp_SecureHashType'];

    const sortedParams = this.sortObject(vnpParams);
    const signData = querystring.stringify(sortedParams, { encode: false });
    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(new Buffer(signData, 'utf-8')).digest('hex');

    return secureHash === signed;
  }

  private sortObject(obj: any): any {
    const sorted = {};
    const keys = Object.keys(obj).sort();
    
    for (const key of keys) {
      if (obj[key]) {
        sorted[key] = obj[key];
      }
    }
    
    return sorted;
  }
} 