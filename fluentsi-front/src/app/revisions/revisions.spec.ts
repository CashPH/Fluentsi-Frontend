import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Revisions } from './revisions';

describe('Revisions', () => {
  let component: Revisions;
  let fixture: ComponentFixture<Revisions>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Revisions],
    }).compileComponents();

    fixture = TestBed.createComponent(Revisions);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
