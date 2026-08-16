import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PublicOpinionInformationComponent } from './public-opinion-information.component';

describe('PublicOpinionInformationComponent', () => {
  let component: PublicOpinionInformationComponent;
  let fixture: ComponentFixture<PublicOpinionInformationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicOpinionInformationComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PublicOpinionInformationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
