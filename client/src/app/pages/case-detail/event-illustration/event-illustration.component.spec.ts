import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GlobalEventLayerComponent } from './global-event-layer.component';

describe('GlobalEventLayerComponent', () => {
  let component: GlobalEventLayerComponent;
  let fixture: ComponentFixture<GlobalEventLayerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GlobalEventLayerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GlobalEventLayerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
