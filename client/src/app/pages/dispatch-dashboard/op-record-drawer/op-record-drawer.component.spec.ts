import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OpRecordDrawerComponent } from './op-record-drawer.component';

describe('OpRecordDrawerComponent', () => {
  let component: OpRecordDrawerComponent;
  let fixture: ComponentFixture<OpRecordDrawerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OpRecordDrawerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OpRecordDrawerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
