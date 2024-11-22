import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SystemTimeComponent } from './system-time.component';

describe('SystemTimeComponent', () => {
  let component: SystemTimeComponent;
  let fixture: ComponentFixture<SystemTimeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SystemTimeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SystemTimeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
