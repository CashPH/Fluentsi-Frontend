import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Calificacionesteacher } from './calificacionesteacher';

describe('Calificacionesteacher', () => {
  let component: Calificacionesteacher;
  let fixture: ComponentFixture<Calificacionesteacher>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Calificacionesteacher],
    }).compileComponents();

    fixture = TestBed.createComponent(Calificacionesteacher);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
