import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InstructoresAdmin } from './instructores-admin';

describe('InstructoresAdmin', () => {
  let component: InstructoresAdmin;
  let fixture: ComponentFixture<InstructoresAdmin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InstructoresAdmin]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InstructoresAdmin);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
