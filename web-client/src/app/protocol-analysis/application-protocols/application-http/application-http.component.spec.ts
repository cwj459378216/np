import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApplicationHttpComponent } from './application-http.component';

describe('ApplicationHttpComponent', () => {
  let component: ApplicationHttpComponent;
  let fixture: ComponentFixture<ApplicationHttpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApplicationHttpComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ApplicationHttpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
