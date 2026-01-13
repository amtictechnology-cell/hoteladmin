import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';

/* ================= TYPES ================= */
type PaymentMode = 'cash' | 'online' | 'cheque';
type TransactionType = 'give' | 'get' | '';

@Component({
  selector: 'app-cprofile',
  templateUrl: './cprofile.html',
  styleUrls: ['./cprofile.scss']
})
export class Cprofile implements OnInit {

  customer: any = null;

  allGivenList: any[] = [];
  allTakenList: any[] = [];
  finalTransactionList: any[] = [];

  totalGiven = 0;
  totalTaken = 0;
  finalBalance = 0;

  id: string = '';

  /* ================= POPUP FIELDS ================= */
  showPopup = false;
  type: TransactionType = '';
  amount = 0;
  description = '';
  billno = '';
  returnDate = '';  // User-selected, no default
  transactionDate = '';  // Auto-filled with today's date
  paymentMode: PaymentMode = 'cash';   // ✅ FIXED
  selectedImage: File | null = null;

  /* ================= BRANCH ================= */
  branches: string[] = ['Gokulpura', 'Sikar', 'Sawlibranch'];
  selectedBranch: string = 'ALL';

  /* ================= DATE FILTER ================= */
  startDate: string = '';
  endDate: string = '';

  /* ================= TOAST ================= */
  toast = {
    show: false,
    message: '',
    type: '' as 'success' | 'error' | 'info'
  };

  /* ================= DELETE MODAL ================= */
  showDeleteModal = false;
  transactionToDelete: any = null;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id') || '';
    this.getCustomer();
    this.getTransactionRecord();
  }


  /* ================= HEADERS ================= */
  getHeaders() {
    const token = localStorage.getItem('token') || '';
    return {
      headers: {
        Authorization: 'Bearer ' + token
      }
    };
  }

  /* ================= TRANSACTIONS ================= */
  getTransactionRecord() {
    this.http.get(
      `https://hotel-api.duckdns.org/api/admin/get/transection-record?transectionUserId=${this.id}`,
      this.getHeaders()
    ).subscribe((res: any) => {

      const data = res.data?.[0];
      if (!data) return;

      this.allGivenList = data.givenToAdmin.map((x: any) => ({
        _id: x._id,
        type: 'give',
        Rs: x.Rs,
        paymentMode: x.paymentMode,
        description: x.description,
        billno: x.billno,
        date: x.updatedAt,
        updatedAt: x.updatedAt,
        returnDate: x.returnDate || x.updatedAt,
        hotelBranchName: x.hotelBranchName,
        paymentScreenshot: x.paymentScreenshoot
      }));

      this.allTakenList = data.takenFromAdmin.map((x: any) => ({
        _id: x._id,
        type: 'get',
        Rs: x.Rs,
        paymentMode: x.paymentMode,
        description: x.description,
        billno: x.billno,
        date: x.updatedAt,
        updatedAt: x.updatedAt,
        returnDate: x.returnDate || x.updatedAt,
        hotelBranchName: x.hotelBranchName,
        paymentScreenshot: x.paymentScreenshoot
      }));

      this.applyFilters();
    });
  }

  /* ================= CUSTOMER ================= */
  getCustomer() {
    this.http.get(
      `https://hotel-api.duckdns.org/api/admin/get/transection-user?transectionUserId=${this.id}`,
      this.getHeaders()
    ).subscribe((res: any) => {
      this.customer = res.data?.[0] || null;
    });
  }

  /* ================= FILTER ================= */
  selectBranch(branch: string) {
    this.selectedBranch = branch;
    this.applyFilters();
  }

  applyFilters() {
    // Step 1: Combine all transactions
    let allTransactions = [...this.allGivenList, ...this.allTakenList];

    // Step 2: Apply branch filter
    const selectedBranchLower = this.selectedBranch.toLowerCase().trim();
    if (selectedBranchLower !== 'all') {
      allTransactions = allTransactions.filter(
        x => (x.hotelBranchName || '').toLowerCase().trim() === selectedBranchLower
      );
    }

    // Step 3: Apply date filter (start date and end date)
    if (this.startDate || this.endDate) {
      const start = this.startDate ? new Date(this.startDate).setHours(0, 0, 0, 0) : null;
      const end = this.endDate ? new Date(this.endDate).setHours(23, 59, 59, 999) : null;

      allTransactions = allTransactions.filter(x => {
        if (!x.updatedAt) return false;
        const txnDate = new Date(x.updatedAt).getTime();

        const matchesStart = !start || txnDate >= start;
        const matchesEnd = !end || txnDate <= end;

        return matchesStart && matchesEnd;
      });
    }

    // Step 4: Sort by date (newest first)
    this.finalTransactionList = allTransactions.sort(
      (a, b) =>
        new Date(b.returnDate || b.updatedAt).getTime() -
        new Date(a.returnDate || a.updatedAt).getTime()
    );

    // Step 5: Calculate totals based on filtered data
    this.totalGiven = this.finalTransactionList
      .filter(x => x.type === 'give')
      .reduce((sum, x) => sum + Number(x.Rs), 0);

    this.totalTaken = this.finalTransactionList
      .filter(x => x.type === 'get')
      .reduce((sum, x) => sum + Number(x.Rs), 0);

    this.finalBalance = this.totalGiven - this.totalTaken;
  }

  resetFilters() {
    this.selectedBranch = 'ALL';
    this.startDate = '';
    this.endDate = '';
    this.applyFilters();
  }

  /* ================= POPUP ================= */
  openPopup(type: TransactionType) {
    this.type = type;
    this.showPopup = true;
    this.amount = 0;
    this.description = '';
    this.billno = '';
    this.returnDate = '';  // Empty by default - user must select
    this.transactionDate = new Date().toISOString().split('T')[0];  // Today's date
    this.selectedImage = null;

    const loginBranch = localStorage.getItem('branchName');
    this.selectedBranch =
      loginBranch && this.branches.includes(loginBranch)
        ? loginBranch
        : this.branches[0];

    this.paymentMode = 'cash';
  }

  closePopup() {
    this.showPopup = false;
    this.type = '';
  }

  onImageSelect(event: any) {
    this.selectedImage = event.target.files?.[0] || null;
  }

  /* ================= SUBMIT ================= */
  submitTransaction() {

    if (!this.amount || this.amount <= 0) {
      this.showToast('error', '✗ Enter valid amount');
      return;
    }

    if (!this.selectedBranch) {
      this.showToast('error', '✗ Please select branch');
      return;
    }

    const formData = new FormData();
    formData.append('transectionUserId', this.id);

    const payload = {
      Rs: Number(this.amount),
      paymentMode: this.paymentMode,
      description: this.description,
      billno: this.billno || null,
      returnDate: this.returnDate || null,  // Optional - user selected
      hotelBranchName: this.selectedBranch,
      updatedAt: this.transactionDate ? new Date(this.transactionDate).toISOString() : new Date().toISOString()  // Transaction Date selected by user
    };

    if (this.type === 'give') {
      formData.append('givenToAdmin', JSON.stringify(payload));
    } else {
      formData.append('takenFromAdmin', JSON.stringify(payload));
    }

    if (this.selectedImage) {
      formData.append('paymentScreenshoot', this.selectedImage);
    }

    this.http.post(
      'https://hotel-api.duckdns.org/api/admin/make-transection',
      formData,
      this.getHeaders()
    ).subscribe({
      next: () => {
        this.getTransactionRecord();
        this.closePopup();
        this.showToast('success', '✓ Transaction Added Successfully!');
      },
      error: (err) => {
        console.error(err);
        this.showToast('error', err.error?.message || '✗ Transaction Failed');
      }
    });
  }

  deleteTransaction(t: any) {
    if (!t || !t._id) {
      this.showToast('error', '✗ Transaction ID missing');
      return;
    }

    // Show delete confirmation modal
    this.transactionToDelete = t;
    this.showDeleteModal = true;
  }

  confirmDelete() {
    if (!this.transactionToDelete) return;

    const payload = {
      transectionUserId: this.id,
      type: this.transactionToDelete.type === 'give' ? 'givenToAdmin' : 'takenFromAdmin',
      objId: this.transactionToDelete._id
    };

    console.log('DELETE PAYLOAD 👉', payload);

    this.http.delete(
      'https://hotel-api.duckdns.org/api/admin/delete/transection-user-entry',
      {
        ...this.getHeaders(),
        body: payload
      }
    ).subscribe({
      next: (res: any) => {
        this.getTransactionRecord();
        this.closeDeleteModal();
        this.showToast('success', '✓ Transaction Deleted Successfully!');
      },
      error: (err) => {
        console.error(err);
        this.closeDeleteModal();
        this.showToast('error', err.error?.message || '✗ Delete Failed');
      }
    });
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.transactionToDelete = null;
  }

  /* ================= TOAST ================= */
  showToast(type: 'success' | 'error' | 'info', message: string) {
    this.toast.type = type;
    this.toast.message = message;
    this.toast.show = true;

    setTimeout(() => {
      this.toast.show = false;
    }, 1000); // ✅ 1 second timing
  }


  /* ================= IMAGE ================= */
  openImage(url: string) {
    window.open(url, '_blank');
  }
}
