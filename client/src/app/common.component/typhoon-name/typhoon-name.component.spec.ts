import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TyphoonNameComponent } from './typhoon-name.component';

describe('TyphoonNameComponent', () => {
  let component: TyphoonNameComponent;
  let fixture: ComponentFixture<TyphoonNameComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TyphoonNameComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TyphoonNameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
