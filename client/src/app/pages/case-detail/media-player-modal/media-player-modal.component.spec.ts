import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MediaPlayerModalComponent } from './media-player-modal.component';

describe('MediaPlayerModalComponent', () => {
  let component: MediaPlayerModalComponent;
  let fixture: ComponentFixture<MediaPlayerModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MediaPlayerModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MediaPlayerModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
