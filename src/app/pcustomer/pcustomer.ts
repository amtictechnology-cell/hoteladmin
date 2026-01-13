import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-pcustomer',
  templateUrl: './pcustomer.html',
  styleUrls: ['./pcustomer.scss']
})
export class Pcustomer implements OnInit {

  showModal = false; // modal control
  isEditMode = false; // flag for edit mode

  customer: any = {
    name: '',
    mobile: '',
    city: '',
    personalCustomerRecordTranId: '' // required for update
  };

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

  isProcessing = false;
  customers: any[] = [];
  allCustomers: any[] = [];  // Master copy for filtering

  /* ================= SEARCH ================= */
  searchQuery: string = '';

  constructor(private http: HttpClient, private router: Router) { }

  ngOnInit() {
    this.getAllCustomers();
  }

  // 🔵 OPEN MODAL
  openModal() {
    this.showModal = true;
  }

  // 🔵 CLOSE MODAL
  closeModal() {
    this.showModal = false;
    this.isEditMode = false;
    this.customer = { name: '', mobile: '', city: '', personalCustomerRecordTranId: '' };
  }

  // ✅ ADD CUSTOMER
  addCustomer() {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.isProcessing = true;
    this.http.post(
      'https://hotel-api.duckdns.org/api/admin/add/personal/customer',
      this.customer,
      { headers }
    ).subscribe({
      next: () => {
        this.showToast('Customer Added Successfully', 'success', 1000);
        this.closeModal();
        this.getAllCustomers();
        this.isProcessing = false;
      },
      error: err => {
        console.error(err);
        this.showToast(err.error?.message || 'Error adding customer', 'error');
        this.isProcessing = false;
      }
    });
  }

  // ✅ GET ALL CUSTOMERS
  getAllCustomers() {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http.get(
      'https://hotel-api.duckdns.org/api/admin/get/personal/customer/users',
      { headers }
    ).subscribe((res: any) => {
      this.allCustomers = res?.data || res;
      this.applySearch(); // Apply current search filter
    });
  }

  // 🔍 SEARCH FILTER
  applySearch() {
    const query = this.searchQuery.trim().toLowerCase();

    if (!query) {
      this.customers = [...this.allCustomers];
    } else {
      this.customers = this.allCustomers.filter(c => {
        const name = (c.name || '').toLowerCase();
        const mobile = (c.mobile || '').toLowerCase();
        return name.includes(query) || mobile.includes(query);
      });
    }
  }

  // 🔍 SEARCH INPUT HANDLER
  onSearchInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery = input?.value || '';
    this.applySearch();
  }

  // 🔍 CLEAR SEARCH
  clearSearch() {
    this.searchQuery = '';
    this.applySearch();
  }

  // 🔹 OPEN PROFILE
  openProfile(customer: any) {
    const id = customer.personalCustomerRecordTranId;
    this.router.navigate(['/home/pcprofile', id]);
  }

  // 🔹 EDIT CUSTOMER
  editCustomer(customer: any) {
    this.isEditMode = true;
    this.showModal = true;
    this.customer = { ...customer }; // copy data to modal
  }

  // 🔹 UPDATE CUSTOMER (PATCH)
  updateCustomer() {
    if (!this.customer.personalCustomerRecordTranId) {
      this.showToast('Customer ID missing!', 'error');
      return;
    }

    const payload = {
      personalCustomerRecordTranId: this.customer.personalCustomerRecordTranId,
      name: this.customer.name,
      mobile: this.customer.mobile,
      city: this.customer.city
    };

    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.isProcessing = true;
    this.http.patch(
      'https://hotel-api.duckdns.org/api/admin/update/personal/customer/profile',
      payload,
      { headers }
    ).subscribe({
      next: () => {
        this.showToast('Customer Updated Successfully', 'success', 1000);
        this.closeModal();
        this.getAllCustomers();
        this.isProcessing = false;
      },
      error: err => {
        console.error(err);
        this.showToast(err.error?.message || 'Error updating customer', 'error');
        this.isProcessing = false;
      }
    });
  }
}
