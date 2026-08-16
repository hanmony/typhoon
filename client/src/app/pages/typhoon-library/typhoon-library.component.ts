import {
  Component,
  ElementRef,
  TemplateRef,
  ViewChild,
  ViewContainerRef,
  signal,
} from "@angular/core";
import { Router } from "@angular/router";
import { intersection } from "lodash-es";
import { NzMessageService } from "ng-zorro-antd/message";
import { NzModalService } from "ng-zorro-antd/modal";
import { LibraryNzModule } from "../../library.nz.module";
import { ApiService } from "../../services/api.service";
import { SettingService } from "../../services/setting.service";
import { StorageService } from "../../services/storage.service";
import { ChangePasswordDialogComponent } from "../manager/change.password.dialog/change.password.dialog.component";
import { DarkPortalCaseListComponent } from "./case-list/case-list.component";
import { DigitalPreplanComponent } from "./digital-preplan/digital-preplan.component";
import { LibraryAiPanelComponent } from "./library-ai-panel/library-ai-panel.component";
import { LibraryRobotComponent } from "./library-robot/library-robot.component";
import { YearTimelineComponent } from "./year-timeline/year-timeline.component";

@Component({
  selector: "app-typhoon-library",
  imports: [
    YearTimelineComponent,
    DarkPortalCaseListComponent,
    LibraryAiPanelComponent,
    LibraryRobotComponent,
    LibraryNzModule,
  ],
  templateUrl: "./typhoon-library.component.html",
  styleUrl: "./typhoon-library.component.less",
})
export class TyphoonLibraryComponent {
  @ViewChild("typhoonLibrary") typhoonLibrary!: ElementRef<HTMLDivElement>;
  @ViewChild("closeIcon") closeIcon!: TemplateRef<void>;

  aiPanelOpen = signal(false);

  digitalPreplanButton = {
    x: 0,
    y: 0,
  };

  constructor(
    private modal: NzModalService,
    public readonly settings: SettingService,
    private readonly storage: StorageService,
    private readonly api: ApiService,
    private readonly router: Router,
    private viewContainerRef: ViewContainerRef,
    private readonly messages: NzMessageService,
  ) {}
  onDigitalPreplanButtonClick() {
    this.createDtModal();
  }
  createDtModal(): void {
    this.modal.create<DigitalPreplanComponent, {}>({
      nzContent: DigitalPreplanComponent,
      nzViewContainerRef: this.viewContainerRef,
      nzClassName: "digital-preplan-modal",
      nzClosable: true,
      nzCloseIcon: this.closeIcon,
      nzData: {
        caseIds: null,
      },
      nzWidth: "94vw",
      nzFooter: null,
    });
  }
  ngAfterViewInit(): void {
    if (!this.settings.user) this.settings.init();
    this.setPreplanPosition();
  }
  setPreplanPosition() {
    const { offsetWidth, offsetHeight } = document.documentElement;
    setTimeout(() => {
      this.digitalPreplanButton = {
        x: offsetWidth - 65 - 85,
        y: offsetHeight * 0.75 + 85 / 2,
      };
    }, 0);
  }
  rolesIn(items) {
    const condition =
      intersection(this.settings.user?.roles || [], items).length > 0;
    return condition;
  }
  openManagement() {
    window.open("/manager/list");
  }
  backToPortal() {
    this.router.navigate(["/portal"]);
  }
  handleLogout() {
    this.api.auth.logout().then(() => {
      this.settings.clear();
      this.storage.token = "";
      this.router.navigate(["/login"]);
    });
  }

  handleChangePassword() {
    this.modal
      .create({
        nzContent: ChangePasswordDialogComponent,
        nzTitle: "修改密码",
      })
      .afterClose.subscribe((result) => {
        if (result) {
          this.messages.info("修改密码成功");
        }
      });
  }
}
