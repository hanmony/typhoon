import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LineOperationComponent } from './line-operation.component';

describe('LineOperationComponent', () => {
  let component: LineOperationComponent;
  let fixture: ComponentFixture<LineOperationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LineOperationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LineOperationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
