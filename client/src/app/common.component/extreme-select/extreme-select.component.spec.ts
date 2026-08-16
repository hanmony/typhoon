import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExtremeSelectComponent } from './extreme-select.component';

describe('ExtremeSelectComponent', () => {
  let component: ExtremeSelectComponent;
  let fixture: ComponentFixture<ExtremeSelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExtremeSelectComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExtremeSelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
