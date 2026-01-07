import { Component } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';


interface Staff {
  staffName: string;
  staffId: string;
  mobile: string;
  attendance: {
    [key: number]: {
      attendance: string;
      time: string;
    };
  };
  totalCount: {
    Present: number;
    Absent: number;
    HalfDay: number;
  };
}

@Component({
  selector: 'app-allattendance',
  templateUrl: './allattendance.html',
  styleUrls: ['./allattendance.scss']
})
export class Allattendance {
  daysInMonth: number[] = [];
  staffList: Staff[] = [];
  selectedMonth: number;
  selectedYear: number;
  todayDate: number;

  constructor(private http: HttpClient) {
    const today = new Date();
    this.selectedMonth = today.getMonth() + 1;
    this.selectedYear = today.getFullYear();
    this.todayDate = today.getDate();
  }

  ngOnInit() {
    this.generateDays();
    this.getMonthlyAttendance();
  }
  generateDays() {
    const totalDays = new Date(this.selectedYear, this.selectedMonth, 0).getDate();
    this.daysInMonth = Array.from({ length: totalDays }, (_, i) => i + 1);
  }
  getMonthlyAttendance() {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    const url = `https://hotel-api.duckdns.org/api/admin/attendance/get/staff-att?month=${this.selectedMonth}&year=${this.selectedYear}`;

    this.http.get<any>(url, { headers }).subscribe({
      next: (res: any) => {
        if (!res?.data) return;

        this.staffList = res.data.map((staff: any) => {
          const modifiedAttendance: {
            [key: number]: { attendance: string; time: string };
          } = {};

          this.daysInMonth.forEach(day => {

            const dayObj = staff.attendance?.[day];

            let attendanceVal = dayObj?.attendance || '—';
            let timeVal = dayObj?.time || '—';

            if (
              day > this.todayDate &&
              this.selectedMonth === new Date().getMonth() + 1 &&
              this.selectedYear === new Date().getFullYear()
            ) {
              modifiedAttendance[day] = {
                attendance: '—',
                time: '—'
              };
            } else {
              modifiedAttendance[day] = {
                attendance: attendanceVal,
                time: timeVal
              };
            }
          });


          return {
            staffName: staff.staffName,
            staffId: staff.staffId,
            mobile: staff.mobile,
            attendance: modifiedAttendance,
            totalCount: staff.totalCount
          };
        });
      },
      error: err => {
        console.error('Error loading attendance:', err);
        alert('⚠️ Unable to load attendance data.');
      }
    });
  }
  onMonthChange(event: any) {
    this.selectedMonth = +event.target.value;
    this.generateDays();
    this.getMonthlyAttendance();
  }
  onYearChange(event: any) {
    this.selectedYear = +event.target.value;
    this.generateDays();
    this.getMonthlyAttendance();
  }
  nextMonth() {
    if (this.selectedMonth === 12) {
      this.selectedMonth = 1;
      this.selectedYear++;
    } else {
      this.selectedMonth++;
    }
    this.generateDays();
    this.getMonthlyAttendance();
  }
}
