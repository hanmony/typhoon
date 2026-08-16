import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-ai-chat-button',
  standalone: true,
  template: `
    <button class="ai-chat-trigger" (click)="clicked.emit()" title="防汛智策助手">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="6" width="20" height="14" rx="3" stroke="currentColor" stroke-width="1.8" fill="none"/>
        <circle cx="10" cy="13" r="1.5" fill="currentColor"/>
        <circle cx="18" cy="13" r="1.5" fill="currentColor"/>
        <path d="M11 17.5c1 1 5 1 6 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
        <line x1="10" y1="6" x2="10" y2="3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="18" y1="6" x2="18" y2="3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        <circle cx="10" cy="2" r="1" fill="currentColor"/>
        <circle cx="18" cy="2" r="1" fill="currentColor"/>
        <line x1="4" y1="20" x2="1" y2="23" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="24" y1="20" x2="27" y2="23" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </button>
  `,
  styles: [`
    .ai-chat-trigger {
      position: relative;
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: linear-gradient(135deg, #1a6dd4, #1890ff);
      color: #fff;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      padding: 0;
      animation: breatheGlow 3s ease-in-out infinite;
    }
    .ai-chat-trigger::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 50%;
      border: 1.5px solid rgba(74, 158, 255, 0.5);
      animation: ringPulse 3s ease-in-out infinite;
      pointer-events: none;
    }
    .ai-chat-trigger:hover {
      transform: scale(1.08);
      animation-play-state: paused;
      box-shadow:
        0 0 24px rgba(24, 144, 255, 0.5),
        0 0 60px rgba(24, 144, 255, 0.15);
    }
    .ai-chat-trigger:active {
      transform: scale(0.95);
    }
    @keyframes breatheGlow {
      0%, 100% {
        box-shadow:
          0 0 12px rgba(24, 144, 255, 0.3),
          0 0 32px rgba(24, 144, 255, 0.08);
      }
      50% {
        box-shadow:
          0 0 22px rgba(24, 144, 255, 0.5),
          0 0 52px rgba(24, 144, 255, 0.18);
      }
    }
    @keyframes ringPulse {
      0% {
        transform: scale(1);
        opacity: 0.6;
      }
      100% {
        transform: scale(1.6);
        opacity: 0;
      }
    }
  `],
})
export class AiChatButtonComponent {
  @Output() clicked = new EventEmitter<void>();
}
