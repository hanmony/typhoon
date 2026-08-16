import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LineSituationComponent } from './line-situation.component';

describe('LineSituationComponent', () => {
  let component: LineSituationComponent;
  let fixture: ComponentFixture<LineSituationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LineSituationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LineSituationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
