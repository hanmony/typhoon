import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KeyEventModalComponent } from './key-event-modal.component';

describe('KeyEventModalComponent', () => {
  let component: KeyEventModalComponent;
  let fixture: ComponentFixture<KeyEventModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KeyEventModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(KeyEventModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
