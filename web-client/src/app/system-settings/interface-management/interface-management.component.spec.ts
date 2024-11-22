import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InterfaceManagementComponent } from './interface-management.component';

describe('InterfaceManagementComponent', () => {
  let component: InterfaceManagementComponent;
  let fixture: ComponentFixture<InterfaceManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InterfaceManagementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InterfaceManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
