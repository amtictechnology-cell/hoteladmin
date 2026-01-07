import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-sprofile',
  templateUrl: './sprofile.html',
  styleUrls: ['./sprofile.scss']
})
export class Sprofile {

  /* ================= DATE FILTER ================= */
  selectedMonth: number | '' = '';
  selectedYear: number | '' = '';

  months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  years: number[] = [];

  /* ================= DELETE MODAL ================= */
  showDeleteModal = false;
  deleteTarget: any = null;
  deleteType: 'takenFromAdmin' | 'givenToAdmin' | null = null;

  /* ================= BASIC ================= */
  supplierId = '';
  supplierData: any = null;
  branches: string[] = [];

  showForm = false;
  formType = '';
  loggedInBranch: string = '';

  transaction = {
    amount: 0,
    paymentMode: '',
    discription: '',
    billno: '',
    hotelBranchName: '',
    returnDate: '',
    updatedAt: ''
  };

  selectedImage: any = null;
  previewImage: string = '';

  takenList: any[] = [];
  givenList: any[] = [];

  allTakenList: any[] = [];
  allGivenList: any[] = [];

  totalTaken = 0;
  totalGiven = 0;

  selectedBranch: string = 'ALL';

  constructor(private route: ActivatedRoute, private http: HttpClient) { }

  ngOnInit() {
    this.loggedInBranch = localStorage.getItem('branchName') || '';
    this.supplierId = this.route.snapshot.paramMap.get('id') || '';
    this.getSupplierDetails();
    this.getTransactions();
  }

  getSupplierDetails() {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http.get(
      `https://hotel-api.duckdns.org/api/admin/get/supplier-persons?supplierId=${this.supplierId}`,
      { headers }
    ).subscribe((res: any) => {
      this.supplierData = res.data[0];
    });
  }

  openForm(type: string) {
    this.formType = type;
    this.showForm = true;
    this.transaction.hotelBranchName = this.loggedInBranch;

    if (!this.transaction.updatedAt) {
      this.transaction.updatedAt = new Date().toISOString().split('T')[0];
    }
  }


  onFileSelect(event: any) {
    this.selectedImage = event.target.files[0];
  }

  submitTransaction() {
    if (!this.transaction.paymentMode) {
      alert('Payment mode select karo');
      return;
    }

    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    const formData = new FormData();
    formData.append('supplierId', this.supplierId);

    const payload: any = {
      Rs: this.transaction.amount,
      paymentMode: this.transaction.paymentMode,
      description: this.transaction.discription,
      billno: this.transaction.billno || null,
      hotelBranchName: this.transaction.hotelBranchName,
      updatedAt: this.transaction.updatedAt
    };

    if (this.transaction.returnDate) {
      payload.returnDate = this.transaction.returnDate;
    }

    if (this.formType === 'taken') {
      formData.append('takenFromAdmin', JSON.stringify(payload));
    } else {
      formData.append('givenToAdmin', JSON.stringify(payload));
    }

    if (this.selectedImage) {
      formData.append('paymentScreenshoot', this.selectedImage);
    }

    this.http.post(
      'https://hotel-api.duckdns.org/api/admin/make-supplier-transection',
      formData,
      { headers }
    ).subscribe(() => {
      this.showForm = false;
      this.selectedImage = null;

      this.transaction = {
        amount: 0,
        paymentMode: '',
        discription: '',
        billno: '',
        hotelBranchName: '',
        returnDate: '',
        updatedAt: ''
      };

      this.getTransactions();
    });
  }

  /* ================= GET TRANSACTIONS ================= */
  getTransactions() {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http.get(
      `https://hotel-api.duckdns.org/api/admin/get/supplier-transection?supplierId=${this.supplierId}`,
      { headers }
    ).subscribe((res: any) => {
      const data = res.data;

      this.allTakenList = data.takenFromAdmin.map((t: any) => ({
        _id: t._id,
        Rs: t.Rs,
        paymentMode: t.paymentMode,
        discription: t.description || '-',
        billno: t.billno || null,
        hotelBranchName: t.hotelBranchName || '',
        entryDate: t.updatedAt,
        returnDate: t.returnDate || null,
        image: t.paymentScreenshoot
      }));

      this.allGivenList = data.givenToAdmin.map((t: any) => ({
        _id: t._id,
        Rs: t.Rs,
        paymentMode: t.paymentMode,
        discription: t.description || '-',
        billno: t.billno || null,
        hotelBranchName: t.hotelBranchName || '',
        entryDate: t.updatedAt,
        returnDate: t.returnDate || null,
        image: t.paymentScreenshoot
      }));

      // ✅ SORT BY LATEST FIRST (descending order)
      this.sortByLatest(this.allTakenList);
      this.sortByLatest(this.allGivenList);

      // ✅ UNIQUE BRANCH LIST
      const allBranches = [
        ...this.allTakenList.map(t => t.hotelBranchName),
        ...this.allGivenList.map(t => t.hotelBranchName)
      ];

      this.branches = Array.from(new Set(allBranches)).filter(b => b);

      // ✅ EXTRACT YEARS FOR FILTER DROPDOWN
      this.extractYears();

      this.applyAllFilters();
    });
  }

  /* ================= YEAR LIST ================= */
  extractYears() {
    const dates = [
      ...this.allTakenList.map(t => t.entryDate),
      ...this.allGivenList.map(t => t.entryDate)
    ];

    this.years = Array.from(
      new Set(dates.map(d => new Date(d).getFullYear()))
    ).sort((a, b) => b - a);
  }

  /* ================= SINGLE FILTER FUNCTION ================= */
  applyAllFilters() {
    let taken = [...this.allTakenList];
    let given = [...this.allGivenList];

    if (this.selectedBranch !== 'ALL') {
      taken = taken.filter(t => t.hotelBranchName === this.selectedBranch);
      given = given.filter(t => t.hotelBranchName === this.selectedBranch);
    }

    if (this.selectedMonth !== '') {
      const monthNum = Number(this.selectedMonth);
      taken = taken.filter(t => new Date(t.entryDate).getMonth() === monthNum);
      given = given.filter(t => new Date(t.entryDate).getMonth() === monthNum);
    }

    if (this.selectedYear !== '') {
      const yearNum = Number(this.selectedYear);
      taken = taken.filter(t => new Date(t.entryDate).getFullYear() === yearNum);
      given = given.filter(t => new Date(t.entryDate).getFullYear() === yearNum);
    }

    this.takenList = taken;
    this.givenList = given;

    this.totalTaken = taken.reduce((s, t) => s + (t.Rs || 0), 0);
    this.totalGiven = given.reduce((s, t) => s + (t.Rs || 0), 0);
  }

  selectBranch(branch: string) {
    this.selectedBranch = branch;
    this.applyAllFilters();
  }

  openImage(img: string) {
    this.previewImage = img;
  }
  clearDateFilter() {
    this.selectedMonth = '';
    this.selectedYear = '';
    this.selectedBranch = 'ALL';
    this.applyAllFilters();
  }

  /* ================= FILTER HANDLERS ================= */
  onMonthChange() {
    this.applyAllFilters();
  }

  onYearChange() {
    this.applyAllFilters();
  }

  /* ================= SORTING HELPER ================= */
  /**
   * Sorts transaction array by entryDate (updatedAt) in descending order
   * Latest transactions appear first
   */
  sortByLatest(list: any[]) {
    list.sort((a, b) => {
      const dateA = new Date(a.entryDate).getTime();
      const dateB = new Date(b.entryDate).getTime();
      return dateB - dateA; // Descending order (latest first)
    });
  }

  /* ================= DELETE MODAL METHODS ================= */
  /**
   * Opens delete confirmation modal
   */
  confirmDelete(transaction: any, type: 'takenFromAdmin' | 'givenToAdmin') {
    if (!transaction || !transaction._id) {
      alert('Transaction ID missing');
      return;
    }
    this.deleteTarget = transaction;
    this.deleteType = type;
    this.showDeleteModal = true;
  }

  /**
   * Executes the delete API call
   */
  executeDelete() {
    if (!this.deleteTarget || !this.deleteType) return;

    const token = localStorage.getItem('token') || '';
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    const payload = {
      supplierId: this.supplierId,
      type: this.deleteType,
      objId: this.deleteTarget._id
    };

    this.http.request(
      'DELETE',
      'https://hotel-api.duckdns.org/api/admin/delete/supplier-transection-entry',
      {
        body: payload,
        headers
      }
    ).subscribe({
      next: () => {
        this.cancelDelete();
        this.getTransactions(); // Refresh list
      },
      error: (err) => {
        console.error(err);
        alert(err.error?.message || 'Delete failed');
        this.cancelDelete();
      }
    });
  }

  /**
   * Closes delete modal and resets state
   */
  cancelDelete() {
    this.showDeleteModal = false;
    this.deleteTarget = null;
    this.deleteType = null;
  }
}
