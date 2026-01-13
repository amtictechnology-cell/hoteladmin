import { Component } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-attendance',
  templateUrl: './attendance.html',
  styleUrls: ['./attendance.scss']
})
export class Attendance {

  staffList: any[] = [];
  filteredStaff: any[] = [];
  searchTerm: string = '';

  showModal = false;
  showEditModal = false;

  selectedStaff: any = null;
  selectedAttendance: string = '';
  selectedEditAttendance: string = '';

  // 🔥 Toast Notification
  toast = {
    show: false,
    message: '',
    type: '' as 'success' | 'error' | 'info'
  };

  constructor(private http: HttpClient) { }

  ngOnInit() {
    this.getStaffList();
  }

  // Load staff
  getStaffList() {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http.get<any>('https://hotel-api.duckdns.org/api/admin/staff/get-list', { headers })
      .subscribe({
        next: res => {
          this.staffList = res.staffList.map((staff: any) => ({
            staffId: staff.staffId,
            firstName: staff.firstName,
            lastName: staff.lastName,
            mobile: staff.mobile,
            address: staff.address || { city: '' },
            branchName: staff.branchName,   // 👈 IMPORTANT
            attendance: 'Not Marked',
            attendanceMarked: false
          }));


          this.filteredStaff = [...this.staffList];
          this.getTodayAttendance();
        }
      });
  }

  getTodayAttendance() {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();

    const url = `https://hotel-api.duckdns.org/api/admin/attendance/get/staff-att?month=${month}&year=${year}`;

    interface TodayAttendance {
      staffId: string;
      attendance: string;
      attendanceMarked: boolean;
    }

    this.http.get<any>(url, { headers }).subscribe({
      next: res => {
        if (!res || !res.data) return;

        const todayData: TodayAttendance[] = res.data.map((staff: any) => {

          // 🔥 Handle number & string day key
          const todayObj =
            staff.attendance?.[day] ||
            staff.attendance?.[String(day)];

          const todayStatus = todayObj?.attendance || '—';

          return {
            staffId: staff.staffId,
            attendance: todayStatus,
            attendanceMarked: todayStatus !== '—'
          };
        });

        // 🔥 Merge with staff list
        this.staffList = this.staffList.map(s => {
          const found = todayData.find(
            (a: TodayAttendance) => a.staffId === s.staffId
          );

          return found ? { ...s, ...found } : s;
        });

        this.filteredStaff = [...this.staffList];
      },
      error: err => {
        console.error('Attendance load failed', err);
      }
    });
  }



  searchStaff() {
    const term = this.searchTerm.toLowerCase();
    this.filteredStaff = this.staffList.filter(
      s =>
        s.firstName.toLowerCase().includes(term) ||
        s.lastName.toLowerCase().includes(term) ||
        s.mobile.includes(term)
    );
  }

  // Open Mark Modal
  openAttendanceModal(staff: any) {
    this.selectedStaff = staff;
    this.selectedAttendance = '';
    this.showModal = true;
  }

  // Submit Attendance
  markSelectedAttendance() {
    if (!this.selectedAttendance) return alert('Select Attendance');

    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    const mapped =
      this.selectedAttendance === 'P' ? 'Present' :
        this.selectedAttendance === 'A' ? 'Absent' :
          this.selectedAttendance === 'H' ? 'Half Day' : 'Paid Leave';

    const payload = {
      staffId: this.selectedStaff.staffId,
      attendanceDetails: { attendance: mapped }
    };

    this.http.post('https://hotel-api.duckdns.org/api/admin/attendance/marked-for-staff', payload, { headers })
      .subscribe({
        next: () => {
          this.selectedStaff.attendance = mapped;
          this.selectedStaff.attendanceMarked = true;
          this.closeModal();
          this.showToast('success', '✓ Attendance Marked Successfully!');
        },
        error: () => {
          this.showToast('error', '✗ Failed to Mark Attendance');
        }
      });
  }

  closeModal() {
    this.showModal = false;
    this.selectedStaff = null;
    this.selectedAttendance = '';
  }

  // Open Edit Modal
  openEditModal(staff: any) {
    this.selectedStaff = staff;
    this.selectedEditAttendance = staff.attendance;
    this.showEditModal = true;
  }

  // Update Attendance
  updateAttendance() {
    if (!this.selectedEditAttendance) return alert('Select Attendance');

    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    const today = new Date();

    const payload = {
      staffId: this.selectedStaff.staffId,
      date: today.getDate(),
      month: today.getMonth() + 1,
      year: today.getFullYear(),
      attendance: this.selectedEditAttendance
    };

    this.http.patch('https://hotel-api.duckdns.org/api/admin/attendance/edit/staff-attendance', payload, { headers })
      .subscribe({
        next: () => {
          this.selectedStaff.attendance = this.selectedEditAttendance;
          this.closeEditModal();
          this.showToast('success', '✓ Attendance Updated Successfully!');
        },
        error: () => {
          this.showToast('error', '✗ Failed to Update Attendance');
        }
      });
  }

  closeEditModal() {
    this.showEditModal = false;
    this.selectedEditAttendance = '';
    this.selectedStaff = null;
  }

  // 🔥 Show Toast Notification
  showToast(type: 'success' | 'error' | 'info', message: string) {
    this.toast.type = type;
    this.toast.message = message;
    this.toast.show = true;

    setTimeout(() => {
      this.toast.show = false;
    }, 1000); // ✅ 1 second timing
  }
  filterByBranch(branch: string) {
    if (branch === 'ALL') {
      this.filteredStaff = [...this.staffList];
    } else {
      this.filteredStaff = this.staffList.filter(
        s => s.branchName === branch
      );
    }
  }

}
