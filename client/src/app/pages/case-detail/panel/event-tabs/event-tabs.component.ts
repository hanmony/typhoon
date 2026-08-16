import { Component, ElementRef, ViewChild } from '@angular/core';
import { fromEvent } from 'rxjs';
import { ActionDto } from '../../../../domain/action.dto';
import { LibraryNzModule } from '../../../../library.nz.module';
import { AutoPlayService } from '../../services/auto-play.service';
import { MessageBoxComponent } from '../message-box/message-box.component';
import { globalCategoryToLabel } from './../../services/utils.service';

export interface Message {
  event: ActionDto;
  unread: boolean;
  expired: boolean;
  collapse: boolean;
}

function calculateDocumentSize(): { width: number; height: number } {
  return {
    width: document.documentElement.clientWidth,
    height: document.documentElement.clientHeight,
  };
}

const tabs = ['预警响应', '路网指令', '媒体宣传', '信息报告'];

type Tab = {
  name: string;
  message: Message[];
};
@Component({
  selector: 'panel-event-tabs',
  imports: [LibraryNzModule, MessageBoxComponent],
  templateUrl: './event-tabs.component.html',
  styleUrl: './event-tabs.component.less',
})
export class EventTabsComponent {
  @ViewChild('tabContentRef', { static: true })
  tabContentRef?: ElementRef<HTMLDivElement>;
  @ViewChild('tabsRef', { static: true })
  tabsRef?: ElementRef<HTMLDivElement>;
  zoom = 1;
  tabs: Tab[] = tabs.map((t) => ({ name: t, message: [] }));
  activeTab: string = '预警响应';
  tabContentHeight = '296px';
  tabContentWidth = '100%';
  autoPlayTime: string = '';
  timers: NodeJS.Timeout[] = [];
  constructor(private readonly autoPlayService: AutoPlayService) {}
  ngAfterViewInit() {
    this.setRect();
    fromEvent(window, 'resize').subscribe(() => {
      this.setRect();
    });
    this.autoPlayService.autoPlayTaskChangeSubject$.subscribe((task) => {
      if (task) {
        this.autoPlayTime = task.startTime;
      } else {
        this.autoPlayTime = '';
      }
    });
  }
  setRect() {
    if (this.tabsRef?.nativeElement) {
      const tcDom = this.tabsRef?.nativeElement;
      const { width } = tcDom.getBoundingClientRect();
      setTimeout(() => {
        this.zoom = Math.round(width) / 500;
      });
    }
    if (this.tabContentRef?.nativeElement) {
      const tcDom = this.tabContentRef?.nativeElement;
      const { top, left } = tcDom.getBoundingClientRect();
      const { height, width } = calculateDocumentSize();
      const tcHeight = height - top;
      const tcWidth = width - left;

      setTimeout(() => {
        this.tabContentHeight = Math.round(tcHeight) + 'px';
        this.tabContentWidth = Math.round(tcWidth) + 'px';
      });
    }
  }
  pushEvent(ev: ActionDto, unread = false) {
    const label = globalCategoryToLabel[ev.category];
    const targetTab = this.tabs.find((t) => t.name === label);
    if (targetTab) {
      if (unread) {
        targetTab.message.forEach((m) => {
          m.collapse = true;
        });
      }
      this.activeTab = targetTab.name;
      const timer = setTimeout(() => {
        targetTab.message.push({
          event: ev,
          unread,
          expired: false,
          collapse: true,
        });
        this.timers = this.timers.filter((t) => t === timer);
        this.resetExpiredProperties();
      }, 500);
      this.timers.push(timer);

      setTimeout(() => {
        this.moveBoxToBottom(ev.category);
      }, 500);
    }
  }
  resetExpiredProperties() {
    this.tabs.forEach((t) => {
      t.message.forEach((m) => {
        const autoTime = new Date(this.autoPlayTime).getTime();
        const endTime = new Date(m.event.toDate).getTime();
        m.expired = this.autoPlayTime ? endTime < autoTime : false;
      });
    });
  }
  moveBoxToBottom(category: ActionDto['category']) {
    const label = globalCategoryToLabel[category];
    const boxDom = this.tabContentRef!.nativeElement!.querySelector(
      `#tab-box-${label}`,
    );
    if (boxDom) {
      const height = boxDom.clientHeight;
      const totalHeight = boxDom.scrollHeight;
      if (totalHeight > height) {
        boxDom.scrollTo({
          top: totalHeight - height,
          behavior: 'smooth',
        });
      }
    }
  }
  moveMessageToTop(message: Message) {
    const label = globalCategoryToLabel[message.event.category];
    const boxDom = this.tabContentRef!.nativeElement!.querySelector(
      `#tab-box-${label}`,
    );
    if (boxDom) {
      const messageDom = boxDom.querySelector(
        `#message-box-${message.event._id}`,
      );
    }
  }
  clearEvents() {
    this.tabs.forEach((t) => {
      t.message = [];
    });
    this.activeTab = '预警响应';
    if (this.timers.length) {
      this.timers.forEach((t) => clearTimeout(t));
      this.timers = [];
    }
  }
  get transformX() {
    const index = this.tabs.findIndex((t) => t.name === this.activeTab);
    return '-' + index * parseInt(this.tabContentWidth) + 'px';
  }
  getTabUnreadCount(tab: Tab) {
    return 0;
    // return tab.message.filter((m) => m.unread).length;
  }
  onClick(message: Message) {
    message.unread = false;
    message.collapse = !message.collapse;
  }
}
