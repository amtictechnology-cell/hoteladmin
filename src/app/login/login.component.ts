import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  loading = false;
  errorMsg: string | null = null;

  private API_URL = 'https://hotel-api.duckdns.org/api/admin/login';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      UserName: ['', Validators.required],
      Password: ['', Validators.required],
      HBranchName: ['', Validators.required]
    });
  }

  submit() {
    if (this.loginForm.invalid) {
      this.errorMsg = 'Please fill all fields.';
      return;
    }

    this.loading = true;
    this.errorMsg = null;

    const payload = this.loginForm.value;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    this.http.post<any>(this.API_URL, payload, { headers }).subscribe({
      next: (res) => {
        this.loading = false;
        const token = res?.user?.token;
        if (token) {
          localStorage.setItem('token', token);
          localStorage.setItem('auth_user', JSON.stringify(res.user));
          localStorage.setItem('branchName', res.user.HBranchName);
          this.router.navigate(['/home']);
        } else {
          this.errorMsg = ' Invalid response from server.';
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg =
          err?.error?.message || 'Login failed. Please check credentials.';
      }
    });
  }
}
