import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExtremeTabsComponent } from './extreme-tabs.component';

describe('ExtremeTabsComponent', () => {
  let component: ExtremeTabsComponent;
  let fixture: ComponentFixture<ExtremeTabsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExtremeTabsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExtremeTabsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
