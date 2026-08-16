import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TyphoonDetailModalComponent } from './typhoon-detail-modal.component';

describe('TyphoonDetailModalComponent', () => {
  let component: TyphoonDetailModalComponent;
  let fixture: ComponentFixture<TyphoonDetailModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TyphoonDetailModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TyphoonDetailModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
