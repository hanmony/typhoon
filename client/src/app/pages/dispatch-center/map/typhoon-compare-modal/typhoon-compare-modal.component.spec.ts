import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TyphoonCompareModalComponent } from './typhoon-compare-modal.component';

describe('TyphoonCompareModalComponent', () => {
  let component: TyphoonCompareModalComponent;
  let fixture: ComponentFixture<TyphoonCompareModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TyphoonCompareModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TyphoonCompareModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
