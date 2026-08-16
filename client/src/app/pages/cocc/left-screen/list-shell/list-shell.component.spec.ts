import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListShellComponent } from './list-shell.component';

describe('ListShellComponent', () => {
  let component: ListShellComponent;
  let fixture: ComponentFixture<ListShellComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListShellComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
