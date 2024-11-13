import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnalyzeAnimationComponent } from './analyze-animation.component';

describe('AnalyzeAnimationComponent', () => {
  let component: AnalyzeAnimationComponent;
  let fixture: ComponentFixture<AnalyzeAnimationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnalyzeAnimationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnalyzeAnimationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
