import { Component } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
@Component({
  selector: 'app-khatabook',
  templateUrl: './khatabook.html',
  styleUrls: ['./khatabook.scss']
})
export class Khatabook {
  users: any[] = [];
  filteredUsers: any[] = [];
  searchTerm = '';
  showModal = false;

  /* ================= TOAST NOTIFICATION ================= */
  toast = {
    show: false,
    message: '',
    type: 'success' as 'success' | 'error'
  };

  showToast(msg: string, type: 'success' | 'error' = 'success', duration: number = 2000) {
    this.toast.message = msg;
    this.toast.type = type;
    this.toast.show = true;
    setTimeout(() => {
      this.toast.show = false;
    }, duration);
  }

  // form fields
  name = '';
  mobile = '';
  city = '';

  constructor(private http: HttpClient, private router: Router) { }

  ngOnInit() {
    this.getUsers();
  }

  getUsers() {
    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    this.http.get<any>(
      'https://hotel-api.duckdns.org/api/admin/get/khatabook/users',
      { headers }
    ).subscribe(res => {
      console.log('Users API Response:', res);
      this.users = res.data || res;
      console.log('Users array:', this.users);
      if (this.users && this.users.length > 0) {
        console.log('First user sample:', this.users[0]);
      }
      this.filteredUsers = this.users;
    });
  }


  searchUser() {
    const term = this.searchTerm.toLowerCase();
    this.filteredUsers = this.users.filter(u =>
      u.name.toLowerCase().includes(term) ||
      u.mobile.includes(term)
    );
  }

  openModal() {
    this.showModal = true;
    console.log("sdsfds");

  }

  closeModal() {
    this.showModal = false;
    this.name = '';
    this.mobile = '';
    this.city = '';
  }

  addUser() {
    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    const payload = {
      name: this.name,
      mobile: this.mobile,
      city: this.city
    };

    this.http.post(
      'https://hotel-api.duckdns.org/api/admin/add/khatabook/user',
      payload,
      { headers }
    ).subscribe({
      next: () => {
        this.showToast('User added successfully', 'success', 1000); // 1-second auto-hide
        this.closeModal();
        this.getUsers();
      },
      error: (err) => {
        this.showToast(err.error?.message || 'Failed to add user', 'error');
      }
    });
  }

  openProfile(user: any) {
    console.log('Opening profile for user:', user);
    console.log('khatabookUserId:', user.khatabookUserId);
    this.router.navigate(['/home/khatabookprofile', user.khatabookUserId]);
    console.log('Navigating to khatabook profile for user:', user.khatabookUserId);

  }

}
