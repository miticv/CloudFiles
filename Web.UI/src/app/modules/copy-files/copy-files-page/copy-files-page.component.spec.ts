import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CopyFilesPageComponent } from './copy-files-page.component';

describe('CopyFilesPageComponent', () => {
  let component: CopyFilesPageComponent;
  let fixture: ComponentFixture<CopyFilesPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CopyFilesPageComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CopyFilesPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
