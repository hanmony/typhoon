import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StateTagComponent } from './state-tag.component';

describe('StateTagComponent', () => {
  let component: StateTagComponent;
  let fixture: ComponentFixture<StateTagComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StateTagComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StateTagComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
