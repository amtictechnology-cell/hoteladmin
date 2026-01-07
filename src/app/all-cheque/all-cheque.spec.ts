import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllCheque } from './all-cheque';

describe('AllCheque', () => {
  let component: AllCheque;
  let fixture: ComponentFixture<AllCheque>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AllCheque]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AllCheque);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
