import * as crypto from "crypto";
import { sm3, sm4 } from "sm-crypto";

export function md5(str: string): string {
    return crypto.createHash("md5").update(str).digest("hex");
}

// 新增 SM3 哈希
export function sm3(str: string): string {
    return sm3(str); // 返回 64 字符的 16 进制字符串
}

/**
 * SM4 解密（国密算法）
 * @param str 要解密的16进制字符串
 * @param key 解密密钥 (16字节/32字节的16进制字符串)
 * @param iv 初始化向量 (可选，16字节的16进制字符串)
 * @returns 解密后的原始字符串
 */
export function sm4Decrypt(str: string, key: string, iv?: string): string {
    const decrypted = sm4.decrypt(str, key, { iv });
    return decrypted;
}
