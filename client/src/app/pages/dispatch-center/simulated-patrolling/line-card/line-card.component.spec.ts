import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LineCardComponent } from './line-card.component';

describe('LineCardComponent', () => {
  let component: LineCardComponent;
  let fixture: ComponentFixture<LineCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LineCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LineCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
