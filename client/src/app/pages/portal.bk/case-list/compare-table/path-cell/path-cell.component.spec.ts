import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PathCellComponent } from './path-cell.component';

describe('PathCellComponent', () => {
  let component: PathCellComponent;
  let fixture: ComponentFixture<PathCellComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PathCellComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PathCellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
