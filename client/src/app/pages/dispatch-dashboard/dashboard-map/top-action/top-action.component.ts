import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import {
  Component,
  computed,
  ElementRef,
  input,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import { fromEvent, Subscription } from 'rxjs';

@Component({
  selector: 'dispatch-top-action',
  imports: [],
  templateUrl: './top-action.component.html',
  styleUrl: './top-action.component.less',
  animations: [
    trigger('dropdown', [
      state('in', style({ transform: 'translate(0, 0%)', opacity: 1 })),
      transition('void => *', [
        style({ transform: 'translate(0, -100%)', opacity: 0 }),
        animate(200),
      ]),
      transition('* => void', [
        animate(200, style({ transform: 'translate(0, -100%)', opacity: 0 })),
      ]),
    ]),
  ],
})
export class DispatchTopActionComponent {
  @ViewChild('teamActionRef') teamActionRef!: ElementRef<HTMLDivElement>;
  @ViewChild('dropdown') dropdown!: ElementRef<HTMLDivElement>;

  top = input('26px');
  width = input('45%');
  actions = input(['事件情况', '线路情况', '抢修队']);
  teamActions = input(['抢修队', '应急值守点']);

  readonly activeAction = input.required<string>();

  actionChange = output<string>();

  onActionSelect(action: string) {
    this.actionChange.emit(action);
  }

  isTeamActionActive = computed(() =>
    this.teamActions().includes(this.activeAction()),
  );
  teamActionLabel = computed(() =>
    this.activeAction() === '应急值守点' ? '应急值守点' : '抢修队',
  );
  teamOptionVisible = signal(false);
  setTeamOptionVisible(visible: boolean) {
    this.teamOptionVisible.set(visible);
    if (visible) {
      this.addListener();
    } else {
      this.removeListener();
    }
  }
  onTeamActionSelect(action: string) {
    this.actionChange.emit(action);
    this.setTeamOptionVisible(false);
  }
  toggleTeamOptionVisible() {
    this.setTeamOptionVisible(!this.teamOptionVisible());
  }
  listen$?: Subscription;
  addListener() {
    this.listen$ = fromEvent(document, 'click').subscribe((e: Event) => {
      if (
        e.target &&
        !this.teamActionRef.nativeElement.parentElement!.contains(
          e.target as Node,
        )
      ) {
        this.teamOptionVisible.set(false);
        this.removeListener();
      }
    });
  }
  removeListener() {
    if (this.listen$) {
      this.listen$?.unsubscribe();
      this.listen$ = undefined;
    }
  }
}
