import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddLessons } from './add-lessons';

describe('AddLessons', () => {
  let component: AddLessons;
  let fixture: ComponentFixture<AddLessons>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddLessons],
    }).compileComponents();

    fixture = TestBed.createComponent(AddLessons);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
