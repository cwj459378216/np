import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApplicationSmtpComponent } from './application-smtp.component';

describe('ApplicationSmtpComponent', () => {
  let component: ApplicationSmtpComponent;
  let fixture: ComponentFixture<ApplicationSmtpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApplicationSmtpComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ApplicationSmtpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
