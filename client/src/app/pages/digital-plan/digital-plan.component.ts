import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router, RouterModule } from '@angular/router';
import {
  contingencyPlan,
  DigitalPlanListItem,
  DigitalPlanListRequest,
} from '../../services/apis/contingencyPlan';
import { PdfAttachmentService } from '../../services/pdf-attachment.service';
import { CommandComponent } from '../typhoon-library/digital-preplan/command/command.component';
import { EmergencyContactFormComponent } from './component/emergency-contact-form/emergency-contact-form.component';
import { GradingTableComponent } from './component/grading-table/grading-table.component';
import { LineDiagramComponent } from './component/line-diagram/line-diagram.component';
import { TyphoonMeasuresComponent } from './component/typhoon-measures/typhoon-measures.component';
import {
  intervalData,
  requirement_content,
} from './digital-plan.data.component';
import { line1 } from './lineSvg/line1';
import { line10 } from './lineSvg/line10';
import { line11 } from './lineSvg/line11';
import { line12 } from './lineSvg/line12';
import { line13 } from './lineSvg/line13';
import { line14 } from './lineSvg/line14';
import { line15 } from './lineSvg/line15';
import { line16 } from './lineSvg/line16';
import { line17 } from './lineSvg/line17';
import { line18 } from './lineSvg/line18';
import { line19 } from './lineSvg/line19';
import { line2 } from './lineSvg/line2';
import { line20 } from './lineSvg/line20';
import { line3 } from './lineSvg/line3';
import { line4 } from './lineSvg/line4';
import { line5 } from './lineSvg/line5';
import { line6 } from './lineSvg/line6';
import { line7 } from './lineSvg/line7';
import { line8 } from './lineSvg/line8';
import { line9 } from './lineSvg/line9';
import {
  WarningPopupComponent,
  WarningRequirement,
} from './warningPop-UpBox/warningPop-UpBox.component';

interface ActualDigitalPlanListResponse {
  list: DigitalPlanListItem[];
  total: number;
}

@Component({
  selector: 'app-digital-plan',
  templateUrl: './digital-plan.component.html',
  styleUrls: ['./digital-plan.component.less'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    WarningPopupComponent,
    LineDiagramComponent,
    EmergencyContactFormComponent,
    GradingTableComponent,
    TyphoonMeasuresComponent,
    CommandComponent,
  ],
})
export class DigitalPlanComponent implements OnInit, OnDestroy, AfterViewInit {
  lineItems = [
    { icon: 'line1.png', id: 1 },
    { icon: 'line2.png', id: 2 },
    { icon: 'line3.png', id: 3 },
    { icon: 'line4.png', id: 4 },
    { icon: 'line5.png', id: 5 },
    { icon: 'line6.png', id: 6 },
    { icon: 'line7.png', id: 7 },
    { icon: 'line8.png', id: 8 },
    { icon: 'line9.png', id: 9 },
    { icon: 'line10.png', id: 10 },
    { icon: 'line11.png', id: 11 },
    { icon: 'line12.png', id: 12 },
    { icon: 'line13.png', id: 13 },
    { icon: 'line14.png', id: 14 },
    { icon: 'line15.png', id: 15 },
    { icon: 'line16.png', id: 16 },
    { icon: 'line17.png', id: 17 },
    { icon: 'line18.png', id: 18 },
    { icon: 'line19.png', id: 19 },
    { icon: 'line20.png', id: 20 },
  ];

  isModalVisible = false;
  caseFollowList: DigitalPlanListItem[] = [];
  loading = false;
  loadingMore = false;
  hasMore = false;

  currentPage = 1;
  itemsPerPage = 8;
  totalItems = 0;

  isSearchExpanded = false;

  // 跟踪当前时间间隔
  currentInterval = 'five';

  isPreviewModalVisible = false;
  currentPreviewDocument?: DigitalPlanListItem;
  safePreviewUrl?: SafeResourceUrl;
  loadingPreview = false;
  attachments: { name: string; url: string }[] = [];
  hasAttachments = false;
  isAttachmentMode = false;
  isViewingAttachment = false;
  loadingAttachments = false;

  isImagePreviewModalVisible = false;

  isWarningModalVisible = false;
  currentWarningTitle = '';
  currentWarningContent?: WarningRequirement;

  // 组件状态
  showMiddleSection = true;
  showLineDiagram = false;
  showEmergencyContactForm = false;
  showGradingTable = false;
  showTyphoonMeasures = false;

  sidderImg = '/assets/images/digital-plan/tableMdale/sidder.png';

  private svgMap = {
    1: line1,
    2: line2,
    3: line3,
    4: line4,
    5: line5,
    6: line6,
    7: line7,
    8: line8,
    9: line9,
    10: line10,
    11: line11,
    12: line12,
    13: line13,
    14: line14,
    15: line15,
    16: line16,
    17: line17,
    18: line18,
    19: line19,
    20: line20,
  };

  ngAfterViewInit() {
    this.loadSvg();
    this.updateInterval('five');
  }

  loadSvg() {
    setTimeout(() => {
      document.querySelectorAll('.svg-dom').forEach((e) => {
        const svgId = e.getAttribute('data-id');
        if (svgId) {
          const svgContent = this.svgMap[svgId];
          if (svgContent) {
            e.innerHTML = svgContent;
          }
        }
      });
    }, 0);
  }

  constructor(
    private router: Router,
    private contingencyPlanService: contingencyPlan,
    private sanitizer: DomSanitizer,
    private pdfAttachmentService: PdfAttachmentService,
  ) {}
  ngOnDestroy(): void {}

  trackByLineId(index: number, item: any): number {
    return item.id;
  }

  get paginatedCaseList() {
    return this.caseFollowList;
  }

  ngOnInit() {}

  private async loadDigitalPlanList() {
    this.loading = true;
    try {
      const requestParams: DigitalPlanListRequest = {
        page: this.currentPage,
        pageSize: this.itemsPerPage,
      };
      const response: any =
        await this.contingencyPlanService.getDigitalPlanList(requestParams);
      this.caseFollowList = response.list || [];
      this.totalItems = response.total || 0;
      this.hasMore = this.currentPage * this.itemsPerPage < this.totalItems;
    } catch (error) {
      console.error('加载数字预案列表失败:', error);
      this.caseFollowList = [];
      this.totalItems = 0;
    } finally {
      this.loading = false;
    }
  }

  showModal() {
    this.isSearchExpanded = true;
    this.isModalVisible = true;
    this.currentPage = 1;
    this.loadDigitalPlanList();
  }

  hideModal() {
    this.isModalVisible = false;
    this.isSearchExpanded = false;
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadDigitalPlanList();
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadDigitalPlanList();
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadDigitalPlanList();
    }
  }

  get totalPages() {
    return Math.max(1, Math.ceil(this.totalItems / this.itemsPerPage));
  }

  backToPortal() {
    this.router.navigate(['/portal']);
  }

  async previewDocument(record: DigitalPlanListItem) {
    this.currentPreviewDocument = record;
    this.loadingPreview = true;
    const fullUrl = this.getFullUrl(record.url);

    const currentOrigin = window.location.origin;
    const finalUrl = fullUrl.startsWith(currentOrigin)
      ? fullUrl.replace(currentOrigin, currentOrigin + '/api')
      : fullUrl;

    this.safePreviewUrl =
      this.sanitizer.bypassSecurityTrustResourceUrl(finalUrl);
    this.isPreviewModalVisible = true;
    this.loadingPreview = false;

    this.loadAttachments(fullUrl);
  }

  private async loadAttachments(pdfUrl: string) {
    this.loadingAttachments = true;
    try {
      const currentOrigin = window.location.origin;
      const finalUrl = pdfUrl.startsWith(currentOrigin)
        ? pdfUrl.replace(currentOrigin, currentOrigin + '/api')
        : pdfUrl;

      const result =
        await this.pdfAttachmentService.parseAttachmentsAsync(finalUrl);
      this.attachments = result.attachments;
      this.hasAttachments = this.attachments.length > 0;
    } catch (error) {
      console.error('加载附件失败:', error);
    } finally {
      this.loadingAttachments = false;
    }
  }

  toggleAttachmentMode() {
    this.isAttachmentMode = !this.isAttachmentMode;
    if (this.isAttachmentMode) {
      this.safePreviewUrl = undefined;
      this.isViewingAttachment = false;
    } else if (this.currentPreviewDocument && !this.isViewingAttachment) {
      const fullUrl = this.getFullUrl(this.currentPreviewDocument.url);
      const currentOrigin = window.location.origin;
      const finalUrl = fullUrl.startsWith(currentOrigin)
        ? fullUrl.replace(currentOrigin, currentOrigin + '/api')
        : fullUrl;
      this.safePreviewUrl =
        this.sanitizer.bypassSecurityTrustResourceUrl(finalUrl);
    }
  }

  downloadAttachment(attachment: { name: string; url: string }) {
    this.pdfAttachmentService.downloadAttachment(attachment);
  }

  viewAttachment(attachment: { name: string; url: string }) {
    this.safePreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      attachment.url,
    );
    this.isAttachmentMode = false;
    this.isViewingAttachment = true;
  }

  private getFullUrl(url: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    const baseUrl = window.location.origin;
    return url.startsWith('/') ? `${baseUrl}${url}` : `${baseUrl}/${url}`;
  }

  hidePreviewModal() {
    this.isPreviewModalVisible = false;
    this.currentPreviewDocument = undefined;
    this.safePreviewUrl = undefined;
    this.attachments = [];
    this.hasAttachments = false;
    this.isAttachmentMode = false;
    this.isViewingAttachment = false;
    this.pdfAttachmentService.cleanup();
  }

  showImagePreviewModal() {
    this.isImagePreviewModalVisible = true;
  }

  hideImagePreviewModal() {
    this.isImagePreviewModalVisible = false;
  }

  showWarningModal(
    alertType: 'redAlert' | 'orangeAlert' | 'yellowAlert' | 'blueAlert',
  ) {
    const alertTitles = {
      redAlert: '红色预警行动要求',
      orangeAlert: '橙色预警行动要求',
      yellowAlert: '黄色预警行动要求',
      blueAlert: '蓝色预警行动要求',
    };

    this.currentWarningTitle = alertTitles[alertType];
    this.currentWarningContent = requirement_content[alertType];
    this.isWarningModalVisible = true;
  }

  hideWarningModal() {
    this.isWarningModalVisible = false;
    this.currentWarningTitle = '';
    this.currentWarningContent = undefined;
  }

  getSvgForLine(id: number) {
    const svgContent = this.svgMap[id];

    if (!svgContent) {
      return this.sanitizer.bypassSecurityTrustHtml('<div>No SVG found</div>');
    }

    return svgContent;
  }

  updateInterval(intervalType: string) {
    this.currentInterval = intervalType;

    const intervalDataLines = intervalData.lines[intervalType];

    if (!intervalDataLines) {
      console.error('Interval data not found for type:', intervalType);
      return;
    }

    intervalDataLines.forEach((lineData) => {
      const lineId = lineData.id;

      // Update car counts
      Object.keys(lineData).forEach((key) => {
        if (key.includes('_car')) {
          const elementId = key;
          const value = lineData[key];
          const elements = document.querySelectorAll(`#${elementId}`);
          elements.forEach((element) => {
            if (element instanceof SVGTextElement) {
              element.textContent = `上线列车${value}列`;
            }
          });
        }

        // Update time intervals
        if (key.includes('_time')) {
          const elementId = key;
          const value = lineData[key];
          const elements = document.querySelectorAll(`#${elementId}`);
          elements.forEach((element) => {
            if (element instanceof SVGTextElement) {
              element.textContent = `行车间隔${value}分钟`;
            }
          });
        }
      });
    });
  }

  // 组件切换方法
  showLineDiagramComponent() {
    this.showMiddleSection = false;
    this.showLineDiagram = true;
    this.showEmergencyContactForm = false;
    this.showGradingTable = false;
    this.showTyphoonMeasures = false;
  }

  showHomeContent() {
    this.showMiddleSection = true;
    this.showLineDiagram = false;
    this.showEmergencyContactForm = false;
    this.showGradingTable = false;
    this.showTyphoonMeasures = false;
    this.loadSvg();
  }

  showEmergencyContactFormComponent() {
    this.showMiddleSection = false;
    this.showLineDiagram = false;
    this.showEmergencyContactForm = true;
    this.showGradingTable = false;
    this.showTyphoonMeasures = false;
  }

  showGradingTableComponent() {
    this.showMiddleSection = false;
    this.showLineDiagram = false;
    this.showEmergencyContactForm = false;
    this.showGradingTable = true;
    this.showTyphoonMeasures = false;
  }

  showTyphoonMeasuresComponent() {
    this.showMiddleSection = false;
    this.showLineDiagram = false;
    this.showEmergencyContactForm = false;
    this.showGradingTable = false;
    this.showTyphoonMeasures = true;
  }
}
