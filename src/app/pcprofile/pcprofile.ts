import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-pcprofile',
  templateUrl: './pcprofile.html',
  styleUrls: ['./pcprofile.scss']
})
export class Pcprofile implements OnInit {


  customer: any;
  customerId: string | null = null;

  /* ================= TOTALS ================= */
  totalBill = 0;
  totalPaid = 0;
  finalBalance = 0;

  entry = {
    billAmount: '',
    amountPaidAfterDiscount: '',
    paymentMode: 'cash',
    description: '',
    status: 'Pending'
  };

  paymentScreenshot: File | null = null;
  entries: any[] = [];

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

  /* ================= EDIT ENTRY MODAL ================= */
  showEditModal = false;
  isProcessing = false;
  selectedEntry: any = null;
  editForm = {
    billAmount: 0,
    amountPaidAfterDiscount: 0,
    paymentMode: 'cash'
  };

  openEditModal(entry: any) {
    this.selectedEntry = entry;
    this.editForm = {
      billAmount: entry.billAmount,
      amountPaidAfterDiscount: entry.amountPaidAfterDiscount,
      paymentMode: entry.paymentMode
    };
    this.showEditModal = true;
  }

  closeEditModal() {
    this.showEditModal = false;
    this.selectedEntry = null;
  }

  updateEntry() {
    if (!this.selectedEntry) return;

    // Basic Validation
    if (!this.editForm.billAmount || !this.editForm.amountPaidAfterDiscount) {
      this.showToast('Please fill all required fields', 'error');
      return;
    }

    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    const payload = {
      personalCustomerEntryId: this.selectedEntry._id || this.selectedEntry.id, // API expects this
      billAmount: this.editForm.billAmount,
      amountPaidAfterDiscount: String(this.editForm.amountPaidAfterDiscount),
      paymentMode: this.editForm.paymentMode
    };

    this.isProcessing = true;
    this.http.patch(
      `${this.api}/update/personal/customer/entry`,
      payload,
      { headers }
    ).subscribe({
      next: () => {
        this.showToast('Entry updated successfully', 'success', 1000);
        this.closeEditModal();
        this.getCustomerEntries(); // Refresh list
        this.isProcessing = false;
      },
      error: (err) => {
        console.error(err);
        this.showToast(err.error?.message || 'Failed to update entry', 'error');
        this.isProcessing = false;
      }
    });
  }

  api = 'https://hotel-api.duckdns.org/api/admin';
  loadingEntries = false;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    public router: Router
  ) { }

  ngOnInit() {
    this.customerId = this.route.snapshot.paramMap.get('id');
    this.getCustomerProfile();
    this.getCustomerEntries();
  }

  // 🔵 GET CUSTOMER PROFILE
  getCustomerProfile() {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get<any>(
      `${this.api}/get/personal/customer/users?personalCustomerRecordTranId=${this.customerId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    ).subscribe(res => {
      this.customer = res.data[0];
    });
  }

  // 🔵 GET CUSTOMER ENTRIES
  getCustomerEntries() {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.loadingEntries = true;
    this.http.get<any>(
      `${this.api}/get/personal/customer/entry?personalCustomerRecordTranId=${this.customerId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    ).subscribe({
      next: res => {
        this.entries = res.data || [];
        this.calculateTotals();
        this.loadingEntries = false;
      },
      error: err => {
        console.error(err);
        this.loadingEntries = false;
      }
    });
  }

  calculateTotals() {
    this.totalBill = this.entries.reduce((sum, e) => sum + Number(e.billAmount || 0), 0);
    this.totalPaid = this.entries.reduce((sum, e) => sum + Number(e.amountPaidAfterDiscount || 0), 0);
    this.finalBalance = this.totalBill - this.totalPaid;
  }

  // 🔵 FILE SELECT
  onFileSelect(event: any) {
    if (event.target.files && event.target.files.length > 0) {
      this.paymentScreenshot = event.target.files[0];
    } else {
      this.paymentScreenshot = null;
    }
  }

  // 🔵 ADD ENTRY (FormData POST)
  addEntry() {
    const token = localStorage.getItem('token');
    if (!token) return this.showToast('Token missing', 'error');
    if (!this.customerId) return this.showToast('Customer ID missing', 'error');

    // Validate required fields
    if (!this.entry.billAmount) {
      return this.showToast('Bill Amount is required', 'error');
    }
    if (!this.entry.amountPaidAfterDiscount) {
      return this.showToast('Amount Paid is required', 'error');
    }

    const formData = new FormData();
    formData.append('personalCustomerRecordTranId', String(this.customerId));
    formData.append('billAmount', String(this.entry.billAmount));
    formData.append('amountPaidAfterDiscount', String(this.entry.amountPaidAfterDiscount));
    formData.append('paymentMode', String(this.entry.paymentMode));
    formData.append('description', String(this.entry.description || ''));
    formData.append('status', String(this.entry.status));

    if (this.paymentScreenshot) {
      formData.append('paymentScreenshoot', this.paymentScreenshot);
    }

    this.isProcessing = true;
    this.http.post(
      `${this.api}/add/personal/customer/entry`,
      formData,
      { headers: { Authorization: `Bearer ${token}` } }
    ).subscribe({
      next: () => {
        this.showToast('Entry Added Successfully', 'success', 1000);
        this.isProcessing = false;
        this.entry = {
          billAmount: '',
          amountPaidAfterDiscount: '',
          paymentMode: 'cash',
          description: '',
          status: 'Pending'
        };
        this.paymentScreenshot = null;
        this.getCustomerEntries();
      },
      error: err => {
        console.error(err);
        this.showToast(err.error?.message || 'Error adding entry', 'error');
        this.isProcessing = false;
      }
    });
  }
}
