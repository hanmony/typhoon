import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CoccComponent } from './cocc.component';

describe('CoccComponent', () => {
  let component: CoccComponent;
  let fixture: ComponentFixture<CoccComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoccComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CoccComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
