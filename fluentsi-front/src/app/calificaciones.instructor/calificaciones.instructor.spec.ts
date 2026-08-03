import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalificacionesInstructor } from './calificaciones.instructor';

describe('CalificacionesInstructor', () => {
  let component: CalificacionesInstructor;
  let fixture: ComponentFixture<CalificacionesInstructor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalificacionesInstructor],
    }).compileComponents();

    fixture = TestBed.createComponent(CalificacionesInstructor);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
