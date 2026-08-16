import { Directive, Input, TemplateRef, ViewContainerRef } from '@angular/core';
import { intersection } from 'lodash-es';
import { SettingService } from '../services/setting.service';

@Directive({
  selector: '[rolesIn]',
  standalone: true,
})
export class RolesInDirective {
  constructor(
    private settings: SettingService,
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
  ) {}

  private hasView = false;

  @Input() set rolesIn(items: string[]) {
    const condition =
      intersection(this.settings.user?.roles || [], items).length > 0;
    if (condition && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!condition && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}
