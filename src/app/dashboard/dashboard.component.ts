import { Component } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';



@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {
  totalDrivers: number = 0;
  totalStaff: number = 0;

  constructor(private http: HttpClient) { }

  ngOnInit() {
    this.getDriversCount();
    this.getStaffCount();
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  private getHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  getDriversCount() {
    this.http.get<any>('https://hotel-api.duckdns.org/api/admin/get-drivers',
      { headers: this.getHeaders() })
      .subscribe({
        next: (res: any) => {
          this.totalDrivers = res.drivers?.length || 0;
        },
      });
  }
  getStaffCount() {
    this.http.get<any>('https://hotel-api.duckdns.org/api/admin/staff/get-list',
      { headers: this.getHeaders() })
      .subscribe({
        next: (res: any) => {
          this.totalStaff = res.staffList?.length || 0;
        },
      });
  }

}
