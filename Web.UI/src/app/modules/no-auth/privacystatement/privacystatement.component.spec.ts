import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrivacystatementComponent } from './privacystatement.component';

describe('PrivacystatementComponent', () => {
  let component: PrivacystatementComponent;
  let fixture: ComponentFixture<PrivacystatementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PrivacystatementComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PrivacystatementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
