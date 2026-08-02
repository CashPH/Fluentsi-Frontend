import { ComponentFixture, TestBed } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { CursosStudentComponent } from './cursos-student';

describe('CursosStudentComponent', () => {
  let component: CursosStudentComponent;
  let fixture: ComponentFixture<CursosStudentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CursosStudentComponent],
      providers: [
        provideHttpClient(),
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CursosStudentComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});