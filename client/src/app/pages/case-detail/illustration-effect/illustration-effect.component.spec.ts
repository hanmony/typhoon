import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IllustrationEffectComponent } from './illustration-effect.component';

describe('IllustrationEffectComponent', () => {
  let component: IllustrationEffectComponent;
  let fixture: ComponentFixture<IllustrationEffectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IllustrationEffectComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(IllustrationEffectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
