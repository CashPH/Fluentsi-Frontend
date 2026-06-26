import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CourseViewer } from './course-viewer';

describe('CourseViewer', () => {
  let component: CourseViewer;
  let fixture: ComponentFixture<CourseViewer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CourseViewer],
    }).compileComponents();

    fixture = TestBed.createComponent(CourseViewer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
