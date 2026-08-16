import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccessoryPanelComponent } from './accessory.panel.component';

describe('AccessoryPanelComponent', () => {
  let component: AccessoryPanelComponent;
  let fixture: ComponentFixture<AccessoryPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccessoryPanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AccessoryPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
