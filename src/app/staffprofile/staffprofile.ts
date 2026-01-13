import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-staffprofile',
  templateUrl: './staffprofile.html',
  styleUrls: ['./staffprofile.scss']
})
export class Staffprofile {
  staffId: string = '';
  staffData: any = null;
  loading: boolean = true;

  // Salary calculation
  monthlySalary = 0;
  perDaySalary = 0;
  calculatedSalary = 0; // Base attendance salary
  finalPayableSalary = 0; // Total after adjustments

  // ID preview
  showIdPreview: boolean = false;
  showLightbox: boolean = false;
  lightboxImage: string = '';

  // Attendance & Filtering
  startDate: string = '';
  endDate: string = '';
  selectedMonth: number = 0; // Keeping for backend fetch
  selectedYear: number = 0;  // Keeping for backend fetch
  attendanceDays: any[] = [];
  totalPresent = 0;
  totalAbsent = 0;
  totalHalfDay = 0;
  totalPaidLeave = 0;

  // Khatabook
  khatabookData: any = {
    takenFromAdmin: [],
    givenToAdmin: [],
    totalTaken: 0,
    totalGiven: 0
  };

  showTransactionModal: boolean = false;
  transactionType: 'given' | 'taken' = 'given';

  // Delete modal
  showDeleteModal: boolean = false;
  itemToDelete: any = null;
  deleteType: 'takenFromAdmin' | 'givenToAdmin' | null = null;

  // Toast
  showToast: boolean = false;
  toastMessage: string = '';
  toastType: 'success' | 'error' = 'success';

  // Transaction form
  transactionForm: any = {
    Rs: 0,
    paymentMode: 'cash',
    description: '',
    hotelBranchName: '',
    billno: null,
    returnDate: null
  };
  selectedFile: File | null = null;

  constructor(private route: ActivatedRoute, private http: HttpClient) { }

  ngOnInit() {
    const today = new Date();
    this.selectedMonth = today.getMonth() + 1;
    this.selectedYear = today.getFullYear();

    // Default to current month range
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    this.startDate = firstDay.toISOString().split('T')[0];
    this.endDate = lastDay.toISOString().split('T')[0];

    this.staffId = this.route.snapshot.paramMap.get('id') || '';
    if (this.staffId) {
      this.getStaffDetail();
      this.getStaffAttendance();
      this.getStaffKhatabook();
    }
  }

  // ====================== STAFF DETAIL ======================
  getStaffDetail() {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http.get<any>(
      `https://hotel-api.duckdns.org/api/admin/staff/get-list?staffId=${this.staffId}`,
      { headers }
    ).subscribe({
      next: (res) => {
        this.staffData = res.staffList?.length ? res.staffList[0] : null;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }
  openTransactionModal(type: 'given' | 'taken') {
    this.transactionType = type;
    this.showTransactionModal = true;
  }

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
  }

  // ====================== ATTENDANCE ======================
  getStaffAttendance() {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    const url = `https://hotel-api.duckdns.org/api/admin/attendance/get/staff-att?month=${this.selectedMonth}&year=${this.selectedYear}`;

    this.http.get<any>(url, { headers }).subscribe({
      next: (res) => {
        if (!res?.data || !Array.isArray(res.data)) return;

        const staff = res.data.find((s: any) => s.staffId === this.staffId);
        if (!staff || !staff.attendance) return;

        this.attendanceDays = [];
        this.resetTotals();

        const start = this.startDate ? new Date(this.startDate).setHours(0, 0, 0, 0) : null;
        const end = this.endDate ? new Date(this.endDate).setHours(23, 59, 59, 999) : null;

        Object.keys(staff.attendance).forEach((day: any) => {
          const entryDate = new Date(this.selectedYear, this.selectedMonth - 1, parseInt(day)).getTime();

          const startMatch = !start || entryDate >= start;
          const endMatch = !end || entryDate <= end;

          if (startMatch && endMatch) {
            const att = staff.attendance[day];
            this.attendanceDays.push({
              day,
              status: att.attendance || '—',
              time: att.time || '—'
            });

            const status = att.attendance;
            if (status === 'Present') this.totalPresent++;
            else if (status === 'Absent') this.totalAbsent++;
            else if (status === 'HalfDay' || status === 'Half Day') this.totalHalfDay++;
            else if (status === 'PaidLeave' || status === 'Paid Leave') this.totalPaidLeave++;
          }
        });

        this.fetchCalculatedSalary();
      }
    });
  }

  fetchCalculatedSalary() {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http.get<any>(
      `https://hotel-api.duckdns.org/api/admin/staff/calculate-salary?staffId=${this.staffId}&month=${this.selectedMonth}&year=${this.selectedYear}`,
      { headers }
    ).subscribe({
      next: (res) => {
        this.monthlySalary = res.currentBaseSalary;
        this.perDaySalary = res.currentBaseSalary / this.getDaysInMonth(this.selectedMonth, this.selectedYear);
        this.calculatedSalary = res.calculatedSalary; // attendance salary

        // Merge manual transactions
        this.updateFinalPayableSalary();
      }
    });
  }

  // ====================== KHATABOOK ======================
  getStaffKhatabook() {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http.get<any>(
      `https://hotel-api.duckdns.org/api/admin/staff/khatabook/get-details?staffId=${this.staffId}&month=${this.selectedMonth}&year=${this.selectedYear}`,
      { headers }
    ).subscribe({
      next: (res) => {
        const rawKhatabook = res.khatabook || {};

        // Local filtering by Date Range
        const filterByRange = (items: any[]) => {
          if (!items || !Array.isArray(items)) return [];
          const start = this.startDate ? new Date(this.startDate).setHours(0, 0, 0, 0) : null;
          const end = this.endDate ? new Date(this.endDate).setHours(23, 59, 59, 999) : null;

          return items.filter((item: any) => {
            const date = new Date(item.updatedAt || item.createdAt).getTime();
            const startMatch = !start || date >= start;
            const endMatch = !end || date <= end;
            return startMatch && endMatch;
          });
        };

        this.khatabookData = { ...rawKhatabook };
        this.khatabookData.takenFromAdmin = filterByRange(rawKhatabook.takenFromAdmin);
        this.khatabookData.givenToAdmin = filterByRange(rawKhatabook.givenToAdmin);

        // Calculate Totals based on filtered data
        this.khatabookData.totalTaken = this.khatabookData.takenFromAdmin.reduce((sum: number, t: any) => sum + t.Rs, 0);
        this.khatabookData.totalGiven = this.khatabookData.givenToAdmin.reduce((sum: number, t: any) => sum + t.Rs, 0);

        // Update final salary
        this.updateFinalPayableSalary();
      },
      error: () => {
        this.khatabookData = {
          takenFromAdmin: [],
          givenToAdmin: [],
          totalTaken: 0,
          totalGiven: 0
        };
      }
    });
  }

  updateFinalPayableSalary() {
    if (!this.khatabookData) {
      this.finalPayableSalary = this.calculatedSalary;
      return;
    }
    const totalTaken = this.khatabookData.totalTaken || 0;
    const totalGiven = this.khatabookData.totalGiven || 0;
    this.finalPayableSalary = (this.calculatedSalary || 0) + totalTaken - totalGiven;
  }

  addTransaction() {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    const formData = new FormData();
    formData.append('staffId', this.staffId);
    formData.append('type', this.transactionType);
    formData.append('Rs', this.transactionForm.Rs.toString());
    formData.append('paymentMode', this.transactionForm.paymentMode);
    formData.append('description', this.transactionForm.description || '');
    if (this.transactionForm.hotelBranchName) formData.append('hotelBranchName', this.transactionForm.hotelBranchName);
    if (this.transactionForm.billno) formData.append('billno', this.transactionForm.billno.toString());
    if (this.transactionForm.returnDate) formData.append('returnDate', this.transactionForm.returnDate);
    if (this.selectedFile) formData.append('paymentScreenshoot', this.selectedFile);

    this.http.post<any>(
      `https://hotel-api.duckdns.org/api/admin/staff/khatabook/add-transaction`,
      formData,
      { headers }
    ).subscribe({
      next: () => {
        this.showTransactionModal = false;
        this.getStaffKhatabook(); // recalc final salary automatically
        this.resetTransactionForm();
        this.showToastMessage('Transaction added successfully!', 'success');
      },
      error: () => {
        this.showToastMessage('Failed to add transaction.', 'error');
      }
    });
  }

  deleteTransaction() {
    if (!this.itemToDelete || !this.deleteType) return;

    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });

    const payload = {
      staffId: this.staffId,
      type: this.deleteType,
      objId: this.itemToDelete._id
    };

    this.http.delete<any>(
      'https://hotel-api.duckdns.org/api/admin/staff/khatabook/delete-entry',
      { headers, body: payload }
    ).subscribe({
      next: () => {
        if (this.deleteType === 'takenFromAdmin') {
          this.khatabookData.takenFromAdmin = this.khatabookData.takenFromAdmin.filter((t: any) => t._id !== this.itemToDelete._id);
          this.khatabookData.totalTaken -= this.itemToDelete.Rs;
        } else {
          this.khatabookData.givenToAdmin = this.khatabookData.givenToAdmin.filter((t: any) => t._id !== this.itemToDelete._id);
          this.khatabookData.totalGiven -= this.itemToDelete.Rs;
        }
        this.updateFinalPayableSalary();
        this.showToastMessage('Transaction deleted successfully!', 'success');
        this.cancelDelete();
      },
      error: () => {
        this.showToastMessage('Failed to delete transaction.', 'error');
        this.cancelDelete();
      }
    });
  }

  showToastMessage(message: string, type: 'success' | 'error') {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    setTimeout(() => this.showToast = false, 1500);
  }

  resetTransactionForm() {
    this.transactionForm = { Rs: 0, paymentMode: 'cash', description: '', hotelBranchName: '', billno: null, returnDate: null };
    this.selectedFile = null;
  }

  resetTotals() {
    this.totalPresent = 0;
    this.totalAbsent = 0;
    this.totalHalfDay = 0;
    this.totalPaidLeave = 0;
  }

  onDateChange() {
    if (!this.startDate) return;

    const start = new Date(this.startDate);
    const newMonth = start.getMonth() + 1;
    const newYear = start.getFullYear();

    // If month/year changed, re-fetch from backend
    if (newMonth !== this.selectedMonth || newYear !== this.selectedYear) {
      this.selectedMonth = newMonth;
      this.selectedYear = newYear;
      this.getStaffAttendance();
      this.getStaffKhatabook();
    } else {
      // Just re-filter local data if only day changed but within same month
      this.getStaffAttendance();
      this.getStaffKhatabook();
    }
  }

  resetFilters() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    this.startDate = firstDay.toISOString().split('T')[0];
    this.endDate = lastDay.toISOString().split('T')[0];
    this.selectedMonth = today.getMonth() + 1;
    this.selectedYear = today.getFullYear();
    this.getStaffAttendance();
    this.getStaffKhatabook();
  }

  getDaysInMonth(month: number, year: number): number { return new Date(year, month, 0).getDate(); }

  openLightbox(imageUrl: string) { if (!imageUrl) return; this.lightboxImage = imageUrl; this.showLightbox = true; document.body.style.overflow = 'hidden'; }
  closeLightbox() { this.showLightbox = false; document.body.style.overflow = 'auto'; }

  confirmDelete(item: any, type: 'takenFromAdmin' | 'givenToAdmin') { this.itemToDelete = item; this.deleteType = type; this.showDeleteModal = true; }
  cancelDelete() { this.showDeleteModal = false; this.itemToDelete = null; this.deleteType = null; }
}
