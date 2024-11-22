import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApplicationFtpComponent } from './application-ftp.component';

describe('ApplicationFtpComponent', () => {
  let component: ApplicationFtpComponent;
  let fixture: ComponentFixture<ApplicationFtpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApplicationFtpComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ApplicationFtpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
