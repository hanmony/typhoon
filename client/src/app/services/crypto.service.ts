import { Injectable } from '@angular/core';
import CryptoJS from 'crypto-es';
import { sm3, sm4 } from 'sm-crypto';
import { Md5 } from 'ts-md5';

@Injectable({
  providedIn: 'root',
})
export class CryptoService {
  constructor() {}

  md5(str: string): string {
    const pwd = Md5.hashStr(str).toLowerCase();
    return pwd;
  }

  // SM3 加密（国密算法）
  sm3(str: string): string {
    return sm3(str); // 返回 64 字符的 16 进制哈希字符串
  }

  aesEncrypt(str: string, key: string): string {
    return CryptoJS.AES.encrypt(str, key).toString();
  }

  aesDecrypt(str: string, key: string): string {
    return CryptoJS.AES.decrypt(str, key).toString(CryptoJS.enc.Utf8);
  }

  /**
   * SM4 加密（国密算法）
   * @param str 要加密的字符串
   * @param key 加密密钥 (16字节/32字节的16进制字符串)
   * @param iv 初始化向量 (可选，16字节的16进制字符串)
   * @returns 加密后的16进制字符串
   */
  sm4Encrypt(str: string, key: string, iv?: string): string {
    const encrypted = sm4.encrypt(str, key, { iv });
    return encrypted;
  }

  /**
   * SM4 解密（国密算法）
   * @param str 要解密的16进制字符串
   * @param key 解密密钥 (16字节/32字节的16进制字符串)
   * @param iv 初始化向量 (可选，16字节的16进制字符串)
   * @returns 解密后的原始字符串
   */
  sm4Decrypt(str: string, key: string, iv?: string): string {
    const decrypted = sm4.decrypt(str, key, { iv });
    return decrypted;
  }

  /**
   * SM4 ECB模式加密
   * @param str 要加密的字符串
   * @param key 加密密钥 (16字节/32字节的16进制字符串)
   * @returns 加密后的16进制字符串
   */
  sm4EcbEncrypt(str: string, key: string): string {
    const encrypted = sm4.encrypt(str, key, { mode: 'ecb' });
    return encrypted;
  }

  /**
   * SM4 ECB模式解密
   * @param str 要解密的16进制字符串
   * @param key 解密密钥 (16字节/32字节的16进制字符串)
   * @returns 解密后的原始字符串
   */
  sm4EcbDecrypt(str: string, key: string): string {
    const decrypted = sm4.decrypt(str, key, { mode: 'ecb' });
    return decrypted;
  }
}
