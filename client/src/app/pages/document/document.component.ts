import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import * as docx from 'docx-preview';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { PdfViewerModule } from 'ng2-pdf-viewer';
import { catchError } from 'rxjs';

window.pdfWorkerSrc = 'assets/js/pdf.worker.min.mjs';

interface IFileDto {
  filename: string;
  caseId: string;
  contentType: string;
}
@Component({
  selector: 'app-document',
  imports: [CommonModule, NzEmptyModule, PdfViewerModule],
  templateUrl: './document.component.html',
  styleUrl: './document.component.less',
})
export class DocumentComponent {
  isDocx = false;
  isPdf = false;
  error = '';
  pdfSrc = '';
  constructor(
    private http: HttpClient,
    private readonly route: ActivatedRoute,
  ) {
    this.route.paramMap.subscribe((paramMap) => {
      const id = paramMap.get('id');
      if (id) {
        this.queryCaseFile(id);
      }
    });
  }
  queryCaseFile(id: string) {
    this.http
      .get<IFileDto>('/manager/editor/get-one-doc?case=' + id)
      .pipe(
        catchError((err) => {
          this.error = '文件不存在';
          return [];
        }),
      )
      .subscribe((res) => {
        const downloadUrl =
          '/manager/editor/download-doc?case=' +
          res.caseId +
          '&filename=' +
          res.filename;
        if (/.+doc?x$/.test(res.filename)) {
          this.isDocx = true;
          this.renderDocx(downloadUrl);
        } else if (/.+pdf$/.test(res.filename)) {
          // this.renderPdf(fileUrl);
          setTimeout(() => {
            this.isPdf = true;
            this.pdfSrc = '/api' + downloadUrl;
          });
        }
      });
  }
  renderDocx(url: string) {
    this.http
      .get(url, {
        responseType: 'blob',
        observe: 'response',
      })
      .pipe(
        catchError(() => {
          this.error = 'docx文件渲染失败';
          return [];
        }),
      )
      .subscribe((res) => {
        if (res.body) {
          const docDom = document.querySelector('#file-render');
          if (!docDom) return;
          docx.renderAsync(res.body, docDom as HTMLDivElement).catch((err) => {
            this.error = 'docx文件渲染失败';
          });
        } else {
          this.error = 'docx文件渲染失败';
        }
      });
  }
  handlePdfError(ev: Event) {
    console.error(ev);
    this.error = 'pdf文件渲染失败';
  }
}
