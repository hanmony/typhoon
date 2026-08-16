import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CategorizeTypesComponent } from './categorize-types.component';

describe('CategorizeTypesComponent', () => {
  let component: CategorizeTypesComponent;
  let fixture: ComponentFixture<CategorizeTypesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategorizeTypesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CategorizeTypesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
