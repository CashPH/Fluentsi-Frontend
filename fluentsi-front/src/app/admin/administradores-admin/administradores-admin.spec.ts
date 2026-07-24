import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdministradoresAdmin } from './administradores-admin';

describe('AdministradoresAdmin', () => {
  let component: AdministradoresAdmin;
  let fixture: ComponentFixture<AdministradoresAdmin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdministradoresAdmin]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdministradoresAdmin);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
