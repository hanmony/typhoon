// services/pdf-attachment.service.ts
import { Injectable } from '@angular/core';

// 从 pdfjs-dist 导入
import * as pdfjsLib from 'pdfjs-dist';

interface PdfAttachment {
  content: Uint8Array;
  description: string;
  filename: string;
  rawFilename: string;
}

export interface AttachmentResult {
  name: string;
  url: string;
}

@Injectable({
  providedIn: 'root',
})
export class PdfAttachmentService {
  private attachmentCache: Map<string, AttachmentResult[]> = new Map();

  constructor() {
    // 配置 PDF.js worker（确保在浏览器环境中）
    if (typeof window !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'assets/js/pdf.worker.min.mjs';
    }
  }

  /**
   * 真实解析 PDF 附件（基于您提供的工作代码）
   * @param pdfUrl PDF 文件 URL
   * @returns附件列表
   */
  async parseAttachmentsAsync(
    pdfUrl: string,
  ): Promise<{ attachments: AttachmentResult[] }> {
    try {
      // 检查缓存
      if (this.attachmentCache.has(pdfUrl)) {
        console.log('🔍 从缓存获取PDF附件:', pdfUrl);
        return { attachments: this.attachmentCache.get(pdfUrl)! };
      }

      console.log('🔍 开始解析PDF附件:', pdfUrl);

      // 1. 加载PDF文档 - 使用配置对象以支持更多选项
      const loadingTask = pdfjsLib.getDocument({
        url: pdfUrl,
        cMapUrl: 'assets/cmaps/',
        cMapPacked: true,
        withCredentials: true,
      });
      const pdfDocument = await loadingTask.promise;

      console.log('📄 PDF文档加载成功，页数:', pdfDocument.numPages);

      // 2. 获取附件列表（关键步骤）
      const attachmentsMap = await pdfDocument.getAttachments();

      // 3. 检查是否存在附件
      if (!attachmentsMap) {
        console.log('这个PDF文档没有包含任何附件。');
        return { attachments: [] };
      }

      // 4. 处理附件对象
      const attachmentList: AttachmentResult[] = [];
      const attachmentEntries = Object.entries(attachmentsMap);

      console.log('📎 找到附件数量:', attachmentEntries.length);

      for (let i = 0; i < attachmentEntries.length; i++) {
        const [filename, attachmentObj] = attachmentEntries[i];
        try {
          const attachment = attachmentObj as PdfAttachment;
          const fileData = attachment.content;
          const realFilename = attachment.rawFilename || filename;

          console.log('附件名称:', realFilename);
          console.log('附件数据类型:', typeof fileData);
          console.log('附件数据长度:', fileData ? fileData.length : 0);

          // 验证附件数据
          if (!fileData || fileData.length === 0) {
            console.warn(`附件 ${realFilename} 数据为空，跳过处理`);
            continue;
          }

          // 创建Blob和URL - 处理类型兼容性
          const blob = new Blob([fileData.buffer as ArrayBuffer], {
            type: this.detectMimeType(realFilename),
          });
          const tempUrl = URL.createObjectURL(blob);

          // 添加到列表
          attachmentList.push({
            name: realFilename,
            url: tempUrl,
          });

          console.log(`✅ 附件准备完成: ${realFilename}`);
        } catch (error) {
          console.error(`处理附件 ${filename} 失败:`, error);
        }
      }

      // 缓存结果
      this.attachmentCache.set(pdfUrl, attachmentList);
      console.log(`✅ PDF附件解析完成，共处理 ${attachmentList.length} 个附件`);

      return { attachments: attachmentList };
    } catch (error) {
      console.error('解析PDF附件时出错:', error);
      console.error('错误详情:', JSON.stringify(error));
      console.error('请求的PDF URL:', pdfUrl);

      // 检查是否是网络错误
      if (error instanceof Error && error.message.includes('NetworkError')) {
        console.error('可能是网络错误或CORS问题，请检查URL是否可访问');
      }

      // 检查是否是PDF结构错误
      if (
        error instanceof Error &&
        error.message.includes('Invalid PDF structure')
      ) {
        console.error('PDF文件结构无效，可能是文件损坏或URL返回了非PDF内容');
      }

      return { attachments: [] };
    }
  }

  /**
   * 检测文件MIME类型
   */
  private detectMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeMap: Record<string, string> = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      txt: 'text/plain',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
    };
    return mimeMap[ext || ''] || 'application/octet-stream';
  }

  /**
   * 下载附件
   */
  downloadAttachment(attachment: AttachmentResult): void {
    try {
      const link = document.createElement('a');
      link.href = attachment.url;
      link.download = attachment.name;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      console.log(`📎 已触发下载: ${attachment.name}`);
    } catch (error) {
      console.error('下载附件失败:', error);
    }
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    // 清理缓存中的URL
    this.attachmentCache.forEach((attachments) => {
      attachments.forEach((att) => {
        try {
          URL.revokeObjectURL(att.url);
        } catch (e) {
          console.warn('释放URL失败:', e);
        }
      });
    });

    this.attachmentCache.clear();
    console.log('🧹 已清理PDF附件临时资源');
  }

  /**
   * 销毁服务
   */
  destroy(): void {
    this.cleanup();
  }
}
