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

  // Attendance
  selectedMonth!: number;
  selectedYear!: number;
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

        Object.keys(staff.attendance).forEach((day: any) => {
          const att = staff.attendance[day];
          this.attendanceDays.push({
            day,
            status: att.attendance || '—',
            time: att.time || '—'
          });

          if (att.attendance === 'Present') this.totalPresent++;
          else if (att.attendance === 'Absent') this.totalAbsent++;
          else if (att.attendance === 'HalfDay' || att.attendance === 'Half Day') this.totalHalfDay++;
          else if (att.attendance === 'PaidLeave' || att.attendance === 'Paid Leave') this.totalPaidLeave++;
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
        this.khatabookData = res.khatabook || {};

        // Helper to filter by month/year
        const filterByDate = (items: any[]) => {
          if (!items || !Array.isArray(items)) return [];
          return items.filter((item: any) => {
            const date = new Date(item.updatedAt);
            return (
              date.getMonth() + 1 === this.selectedMonth &&
              date.getFullYear() === this.selectedYear
            );
          });
        };

        // Filter transactions
        this.khatabookData.takenFromAdmin = filterByDate(this.khatabookData.takenFromAdmin);
        this.khatabookData.givenToAdmin = filterByDate(this.khatabookData.givenToAdmin);

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

  onMonthChange(event: any) {
    this.selectedMonth = +event.target.value;
    this.getStaffAttendance();
    this.getStaffKhatabook();
  }
  onYearChange(event: any) {
    this.selectedYear = +event.target.value;
    this.getStaffAttendance();
    this.getStaffKhatabook();
  }

  getDaysInMonth(month: number, year: number): number { return new Date(year, month, 0).getDate(); }

  openLightbox(imageUrl: string) { if (!imageUrl) return; this.lightboxImage = imageUrl; this.showLightbox = true; document.body.style.overflow = 'hidden'; }
  closeLightbox() { this.showLightbox = false; document.body.style.overflow = 'auto'; }

  confirmDelete(item: any, type: 'takenFromAdmin' | 'givenToAdmin') { this.itemToDelete = item; this.deleteType = type; this.showDeleteModal = true; }
  cancelDelete() { this.showDeleteModal = false; this.itemToDelete = null; this.deleteType = null; }
}
