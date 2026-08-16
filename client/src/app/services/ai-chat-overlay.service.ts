import { Injectable, inject, ComponentRef } from '@angular/core';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { AiChatButtonComponent } from '../common.component/chat-panel/ai-chat-button.component';
import { ChatPanelComponent } from '../common.component/chat-panel/chat-panel.component';

export interface AiChatButtonPosition {
  bottom?: string;
  right?: string;
}

export interface AiChatPanelPosition {
  top?: string;
  right?: string;
  width?: number;
  height?: string;
}

@Injectable({ providedIn: 'root' })
export class AiChatOverlayService {
  private overlay = inject(Overlay);
  private panelOverlayRef: OverlayRef | null = null;
  private buttonOverlayRef: OverlayRef | null = null;
  private panelOptions: Required<AiChatPanelPosition> = {
    top: '0',
    right: '0',
    width: 400,
    height: '100vh',
  };

  initButton(options?: { panelWidth?: number; position?: AiChatButtonPosition; panelPosition?: AiChatPanelPosition }) {
    if (this.buttonOverlayRef) return;
    if (options?.panelWidth) this.panelOptions.width = options.panelWidth;
    if (options?.panelPosition) Object.assign(this.panelOptions, options.panelPosition);

    const pos = options?.position ?? {};
    const bottom = pos.bottom ?? '24px';
    const right = pos.right ?? '24px';

    this.buttonOverlayRef = this.overlay.create({
      positionStrategy: this.overlay.position()
        .global()
        .bottom(bottom)
        .right(right),
      hasBackdrop: false,
      scrollStrategy: this.overlay.scrollStrategies.noop(),
    });

    const buttonPortal = new ComponentPortal(AiChatButtonComponent);
    const buttonRef = this.buttonOverlayRef.attach(buttonPortal);
    buttonRef.instance.clicked.subscribe(() => this.togglePanel());
  }

  hideButton() {
    this.closePanel();
    this.buttonOverlayRef?.dispose();
    this.buttonOverlayRef = null;
  }

  togglePanel() {
    if (this.panelOverlayRef) {
      this.closePanel();
    } else {
      this.openPanel();
    }
  }

  openPanel() {
    if (this.panelOverlayRef) return;

    const { width, top, right, height } = this.panelOptions;
    const strategy = this.overlay.position().global().top(top).right(right);

    this.panelOverlayRef = this.overlay.create({
      positionStrategy: strategy,
      width: `${width}px`,
      height,
      hasBackdrop: false,
      scrollStrategy: this.overlay.scrollStrategies.noop(),
      panelClass: 'ai-chat-panel-overlay',
    });

    const panelPortal = new ComponentPortal(ChatPanelComponent);
    const panelRef: ComponentRef<ChatPanelComponent> = this.panelOverlayRef.attach(panelPortal);
    panelRef.instance.width = width;
    panelRef.instance.closeEvent.subscribe(() => this.closePanel());
  }

  closePanel() {
    this.panelOverlayRef?.dispose();
    this.panelOverlayRef = null;
  }
}
