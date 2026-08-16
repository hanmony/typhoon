import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConstructionItemComponent } from './construction-item.component';

describe('ConstructionItemComponent', () => {
  let component: ConstructionItemComponent;
  let fixture: ComponentFixture<ConstructionItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConstructionItemComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ConstructionItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
