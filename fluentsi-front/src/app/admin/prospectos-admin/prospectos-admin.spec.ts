import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProspectosAdmin } from './prospectos-admin';

describe('ProspectosAdmin', () => {
  let component: ProspectosAdmin;
  let fixture: ComponentFixture<ProspectosAdmin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProspectosAdmin]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProspectosAdmin);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
