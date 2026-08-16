import { Location } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { CommonNzModule } from '../../../common.nz.module';
import { CaseDto } from '../../../domain/case.dto';
import { RolesInDirective } from '../../../middlewares/roles.in.directive';
import { ApiService } from '../../../services/api.service';
import { EditorActionsComponent } from './editor.actions/editor.actions.component';
import { EditorConfigComponent } from './editor.config/editor.config.component';
import { EditorDocComponent } from './editor.doc/editor.doc.component';
import { EditorPathInfoComponent } from './editor.path.info/editor.path.info.component';

@Component({
  selector: 'app-case.editor',
  imports: [
    CommonNzModule,
    RolesInDirective,
    EditorConfigComponent,
    EditorPathInfoComponent,
    EditorActionsComponent,
    EditorDocComponent,
  ],
  templateUrl: './case.editor.component.html',
  styleUrl: './case.editor.component.less',
})
export class CaseEditorComponent implements OnInit, OnDestroy {
  constructor(
    readonly activatedRoute: ActivatedRoute,
    private readonly router: Router,
    private readonly location: Location,
    private readonly messages: NzMessageService,
    private readonly apis: ApiService,
  ) {
    this.refresh$
      .pipe(takeUntil(this.destroy$), debounceTime(500))
      .subscribe(() => this.fetchCase());
    activatedRoute.params.subscribe((params) =>
      this.handleParamsChanged(params),
    );
  }

  private readonly destroy$ = new Subject<void>();
  private readonly refresh$ = new Subject<void>();

  loading = true;
  caseId: string = '';
  caseStatus: string = '';
  currentCase?: CaseDto;

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  handleParamsChanged(params: Params) {
    this.caseId = params['id'];
    this.caseStatus = params['status'];
    this.refresh$.next();
  }

  handleBack() {
    this.router.navigate([
      '/manager/list',
      { caseId: this.caseId, caseStatus: this.caseStatus },
    ]);
    // this.location.back();
  }

  handleStartEdit() {
    this.loading = true;
    this.apis.manager
      .startEdit({
        id: this.currentCase!._id,
      })
      .then((doc) => {
        this.currentCase = doc;
        this.messages.success('编辑已开始');
      })
      .finally(() => (this.loading = false));
  }

  handleFinishEdit() {
    this.loading = true;
    this.apis.manager
      .finishEdit({
        id: this.currentCase!._id,
      })
      .then((doc) => {
        this.currentCase = doc;
        this.messages.success('编辑已完成');
      })
      .finally(() => (this.loading = false));
  }

  handleDeactive() {
    this.loading = true;
    this.apis.manager
      .deactiveCase({
        id: this.currentCase!._id,
      })
      .then((doc) => {
        this.currentCase = doc;
        this.messages.success('案例已下架');
      })
      .finally(() => (this.loading = false));
  }

  handleActive() {
    this.loading = true;
    this.apis.manager
      .activeCase({
        id: this.currentCase!._id,
      })
      .then((doc) => {
        this.currentCase = doc;
        this.messages.success('案例已上架');
      })
      .finally(() => (this.loading = false));
  }

  private async fetchCase() {
    this.loading = true;
    this.currentCase = await this.apis.manager
      .getCase(this.caseId)
      .finally(() => (this.loading = false));
  }
}
