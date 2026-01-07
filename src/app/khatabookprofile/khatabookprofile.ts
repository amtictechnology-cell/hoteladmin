import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-khatabookprofile',
  templateUrl: './khatabookprofile.html',
  styleUrls: ['./khatabookprofile.scss']
})
export class Khatabookprofile {
  totalTaken = 0;
  totalGiven = 0;
  finalBalance = 0;

  showModal = false;
  transactionType: 'taken' | 'given' = 'taken';

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

  /* ================= CUSTOM DELETE CONFIRMATION ================= */
  showDeleteModal = false;
  deleteTarget: any = null;
  deleteTargetType: 'taken' | 'given' | null = null;

  confirmDelete(type: 'taken' | 'given', item: any) {
    this.deleteTarget = item;
    this.deleteTargetType = type;
    this.showDeleteModal = true;
  }

  cancelDelete() {
    this.showDeleteModal = false;
    this.deleteTarget = null;
    this.deleteTargetType = null;
  }

  branchName = ''; // Selected branch
  branchList = ['Gokulpurabranch', 'Sikarbranch', 'Sanwalibranch']; // All available branches

  transactions: any[] = [];
  takenList: any[] = [];
  givenList: any[] = [];

  transactionForm: any = {
    Rs: '',
    returnDate: '',
    description: '',
    paymentMode: 'cash',
    billno: '',
    hotelBranchName: ''
  };

  userId: string | null = '';
  userProfile: any = null;
  isLoading = false;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) { }

  ngOnInit() {
    this.userId = this.route.snapshot.paramMap.get('id');

    const adminRaw = localStorage.getItem('admin');
    if (adminRaw) {
      const admin = JSON.parse(adminRaw);
      // Login branch default
      this.branchName = admin.user?.HBranchName || admin.HBranchName || '';
    }

    if (this.userId) {
      this.getUserProfile();
      this.getTransactions();
    }
  }

  getUserProfile() {
    this.isLoading = true;
    this.errorMessage = '';

    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    const apiUrl = 'https://hotel-api.duckdns.org/api/admin/get/khatabook/users';
    this.http.get<any>(apiUrl, { headers }).subscribe({
      next: (res) => {
        const allUsers = res.data || res;
        this.userProfile = allUsers.find((user: any) => user.khatabookUserId === this.userId);
        if (!this.userProfile) this.errorMessage = `User with ID ${this.userId} not found`;
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to load user profile';
        this.isLoading = false;
      }
    });
  }

  goBack() {
    this.router.navigate(['/home/khatabook']);
  }

  openTransactionModal(type: 'taken' | 'given') {
    this.transactionType = type;
    this.showModal = true;

    this.transactionForm = {
      Rs: '',
      returnDate: new Date().toISOString().substring(0, 10),
      description: '',
      paymentMode: 'cash',
      billno: '',
      hotelBranchName: this.branchName // Default branch
    };
  }

  closeModal() {
    this.showModal = false;
  }

  submitTransaction() {
    if (!this.transactionForm.hotelBranchName) {
      alert('Please select branch');
      return;
    }

    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    const formData = new FormData();
    formData.append('khatabookUserId', this.userId!);

    const payload = {
      Rs: this.transactionForm.Rs,
      returnDate: this.transactionForm.returnDate,
      description: this.transactionForm.description,
      paymentMode: this.transactionForm.paymentMode,
      billno: this.transactionForm.billno,
      hotelBranchName: this.transactionForm.hotelBranchName
    };

    if (this.transactionType === 'taken') {
      formData.append('takenFromAdmin', JSON.stringify(payload));
    } else {
      formData.append('givenToAdmin', JSON.stringify(payload));
    }

    this.http.post(
      'https://hotel-api.duckdns.org/api/admin/add/khatabook/transection',
      formData,
      { headers }
    ).subscribe({
      next: () => {
        this.showToast('Transaction saved successfully');
        this.closeModal();
        this.getTransactions();
      },
      error: (err) => {
        this.showToast(err.error?.message || 'Failed to save transaction', 'error');
        console.error(err);
      }
    });
  }

  getTransactions() {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    this.http.get<any>(
      'https://hotel-api.duckdns.org/api/admin/get/khatabook/transection',
      { headers }
    ).subscribe({
      next: (res) => {
        const record = res.data?.find(
          (r: any) => r.khatabookUserId === this.userId
        );

        this.takenList = record?.takenFromAdmin || [];
        this.givenList = record?.givenToAdmin || [];

        // 🔥 TOTAL CALCULATION
        this.totalTaken = this.takenList.reduce(
          (sum: number, t: any) => sum + Number(t.Rs || 0), 0
        );

        this.totalGiven = this.givenList.reduce(
          (sum: number, g: any) => sum + Number(g.Rs || 0), 0
        );

        this.finalBalance = this.totalTaken - this.totalGiven;
      },
      error: (err) => {
        console.error(err);
      }
    });
  }

  executeDelete() {
    if (!this.deleteTarget || !this.deleteTargetType) return;

    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    const payload = {
      khatabookUserId: this.userId!,
      objId: this.deleteTarget._id,
      type: this.deleteTargetType === 'taken' ? 'takenFromAdmin' : 'givenToAdmin'
    };

    this.http.delete(
      'https://hotel-api.duckdns.org/api/admin/delete/khatabook/transection-entry',
      { headers, body: payload }
    ).subscribe({
      next: (res) => {
        this.showToast('Transaction deleted successfully');
        this.cancelDelete();
        this.getTransactions(); // Refresh the list
      },
      error: (err) => {
        console.error('Delete transaction error:', err);
        this.showToast('Failed to delete transaction', 'error');
        this.cancelDelete();
      }
    });
  }

}
