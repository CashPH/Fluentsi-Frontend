import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CursosStudent } from './cursos-student';

describe('CursosStudent', () => {
   let component: CursosStudent;
    let fixture: ComponentFixture<CursosStudent>;
  
    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [CursosStudent],
      }).compileComponents();
  
      fixture = TestBed.createComponent(CursosStudent);
      component = fixture.componentInstance;
      await fixture.whenStable();
    });
  
    it('should create', () => {
      expect(component).toBeTruthy();
    });
  });
  