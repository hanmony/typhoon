import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExtremeMarkersComponent } from './extreme-markers.component';

describe('ExtremeMarkersComponent', () => {
  let component: ExtremeMarkersComponent;
  let fixture: ComponentFixture<ExtremeMarkersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExtremeMarkersComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExtremeMarkersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
