import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TopActionComponent } from './top-action.component';

describe('TopActionComponent', () => {
  let component: TopActionComponent;
  let fixture: ComponentFixture<TopActionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopActionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TopActionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
