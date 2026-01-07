import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-logout',
  templateUrl: './logout.html',
  styleUrls: ['./logout.scss']
})
export class Logout {
  constructor(private router: Router) {}

  cancel() {
    this.router.navigate(['/home']); // back to dashboard
  }

  logout() {
    localStorage.clear(); // ya token remove
    sessionStorage.clear();
    this.router.navigate(['/login']);
  }
}
