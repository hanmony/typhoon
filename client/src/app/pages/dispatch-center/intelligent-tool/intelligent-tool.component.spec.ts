import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IntelligentToolComponent } from './intelligent-tool.component';

describe('IntelligentToolComponent', () => {
  let component: IntelligentToolComponent;
  let fixture: ComponentFixture<IntelligentToolComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IntelligentToolComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IntelligentToolComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
