import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-expensis',
  templateUrl: './expensis.html',
  styleUrls: ['./expensis.scss']
})
export class Expensis {
  activeDiv: string = "customer";
  customers: any[] = [];
  filteredCustomers: any[] = [];
  searchText: string = "";
  showModal: boolean = false;

  form = {
    name: "",
    mobile: "",
    city: ""
  };

  /* ================= DATE FILTER (EXPENSE ONLY) ================= */
  selectedExpenseMonth: number | '' = '';
  selectedExpenseYear: number | '' = '';
  months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  availableExpenseYears: number[] = [];

  /* ================= CUSTOM DELETE CONFIRMATION ================= */
  showDeleteModal = false;
  deleteTarget: any = null;
  deleteType: 'earnings' | 'expenses' | null = null;

  /* ================= TOAST NOTIFICATION ================= */
  toast = {
    show: false,
    message: '',
    type: 'success' as 'success' | 'error'
  };

  showToast(msg: string, type: 'success' | 'error' = 'success') {
    this.toast.message = msg;
    this.toast.type = type;
    this.toast.show = true;
    setTimeout(() => {
      this.toast.show = false;
    }, 2000);
  }

  constructor(private http: HttpClient, private router: Router) { }

  ngOnInit() {
    this.getCustomers();
    const savedBranch = localStorage.getItem('branchName');
    if (savedBranch) {
      this.selectedBranch = savedBranch;
      this.expenseForm.branch = savedBranch;
      this.earningForm.branch = savedBranch;
    }
  }

  openDiv(div: string) {
    this.activeDiv = div;

    if (div === "customer") {
      this.getCustomers();
    }

    if (div === "expense") {
      this.getHotelExpenseReport();
    }

    if (div === "supplier") {
      this.getSuppliers();
    }
  }


  getHeaders() {
    const token = localStorage.getItem("token") || "";
    return {
      headers: { Authorization: "Bearer " + token }
    };
  }
  getCustomers() {
    this.http.get("https://hotel-api.duckdns.org/api/admin/get/transection-user", this.getHeaders())
      .subscribe({
        next: (res: any) => {
          this.customers = res.data || res;
          this.filteredCustomers = [...this.customers];
        },
      });
  }

  filterCustomers() {
    const text = this.searchText.toLowerCase().trim();
    this.filteredCustomers = this.customers.filter(c =>
      c.name?.toLowerCase().includes(text) ||
      c.mobile?.toLowerCase().includes(text)
    );
  }

  openModal() {
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.form = { name: "", mobile: "", city: "" };
  }

  submitCustomer() {
    const payload = {
      name: this.form.name,
      mobile: this.form.mobile,
      address: { city: this.form.city }
    };

    this.http.post("https://hotel-api.duckdns.org/api/admin/create-transection-user", payload, this.getHeaders())
      .subscribe({
        next: () => {
          this.closeModal();
          this.getCustomers();
        },
      });
  }

  navigateToProfile(cust: any) {
    this.router.navigate(['/home/cprofile', cust.transectionUserId]);
  }

  hotelExpenses: any[] = [];
  hotelEarnings: any[] = [];

  totalMonthlyEarnings: number = 0;
  totalMonthlyExpenses: number = 0;

  allHotelExpenses: any[] = []; // Store original list for filtering
  allHotelEarnings: any[] = []; // Store original list for filtering

  showAddExpenseForm: boolean = false;
  showAddEarningForm: boolean = false;

  expenseForm = {
    amount: "",
    items: "",
    date: "",
    mode: "cash",
    billno: "",
    description: "",
    time: "",
    branch: 'Gokulpura'
  };

  earningForm = {
    amount: "",
    details: "",
    date: "",
    mode: "cash",
    time: "",
    billno: "",
    description: "",
    branch: 'Gokulpura'
  };

  resetExpenseForm() {
    this.expenseForm = {
      amount: "",
      items: "",
      date: new Date().toISOString().split('T')[0],
      mode: "cash",
      billno: "",
      description: "",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      branch: this.selectedBranch
    };
    this.selectedExpenseImage = null;
  }

  resetEarningForm() {
    this.earningForm = {
      amount: "",
      details: "",
      date: new Date().toISOString().split('T')[0],
      mode: "cash",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      billno: "",
      description: "",
      branch: this.selectedBranch
    };
    this.selectedEarningImage = null;
  }
  selectedEarningImage: File | null = null;
  selectedExpenseImage: File | null = null;

  onEarningImageSelect(event: any) {
    this.selectedEarningImage = event.target.files[0];
  }

  onExpenseImageSelect(event: any) {
    this.selectedExpenseImage = event.target.files[0];
  }
  branches = [
    'Gokulpurabranch',
    'Sikarbranch',
    'Sawlibranch'
  ];

  selectedBranch: string = 'Gokulpura';
  changeBranch(branch: string) {
    this.selectedBranch = branch;
    this.expenseForm.branch = branch;
    this.earningForm.branch = branch;
    this.getHotelExpenseReport(branch);
  }

  getHotelExpenseReport(branch?: string) {
    const b = branch || this.selectedBranch;
    this.http.get(
      `https://hotel-api.duckdns.org/api/admin/get/earning-expense-report?hotelBranchName=${this.selectedBranch}`,
      this.getHeaders()
    ).subscribe({
      next: (res: any) => {
        const data = res.data || {};
        this.allHotelEarnings = data.earnings || [];
        this.allHotelExpenses = data.expenses || [];

        // ✅ EXTRACT AVAILABLE YEARS
        this.extractExpenseYears();

        // ✅ APPLY FILTERS
        this.applyAllFilters();
      }
    });
  }

  extractExpenseYears() {
    // Collect dates from both lists to get all available years
    const expenseDates = this.allHotelExpenses.map(e => e.earningDate || e.expenseDate);
    const earningDates = this.allHotelEarnings.map(e => e.earningDate || e.expenseDate);
    const allDates = [...expenseDates, ...earningDates];

    this.availableExpenseYears = Array.from(
      new Set(allDates.map(d => d ? new Date(d).getFullYear() : null))
    ).filter((y): y is number => y !== null && !isNaN(y)).sort((a, b) => b - a);
  }

  applyAllFilters() {
    const monthSelected = this.selectedExpenseMonth !== '';
    const yearSelected = this.selectedExpenseYear !== '';

    const filterFn = (item: any) => {
      if (!monthSelected && !yearSelected) return true;

      const dateVal = item.earningDate || item.expenseDate;
      if (!dateVal) return false;

      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return false;

      const matchMonth = monthSelected ? d.getMonth() === Number(this.selectedExpenseMonth) : true;
      const matchYear = yearSelected ? d.getFullYear() === Number(this.selectedExpenseYear) : true;

      return matchMonth && matchYear;
    };

    // Filter both lists
    this.hotelExpenses = this.allHotelExpenses.filter(filterFn);
    this.hotelEarnings = this.allHotelEarnings.filter(filterFn);

    // Recalculate Totals based on filtered lists
    this.totalMonthlyExpenses = this.hotelExpenses.reduce((acc, curr) => acc + (Number(curr.expenseAmount) || 0), 0);
    this.totalMonthlyEarnings = this.hotelEarnings.reduce((acc, curr) => acc + (Number(curr.earningAmount) || 0), 0);
  }

  onExpenseFilterChange() {
    this.applyAllFilters();
  }

  clearExpenseFilters() {
    this.selectedExpenseMonth = '';
    this.selectedExpenseYear = '';
    this.applyAllFilters();
  }

  addExpense() {
    const formData = new FormData();
    formData.append("expenseAmount", String(this.expenseForm.amount));
    formData.append("expenseItems", this.expenseForm.items);
    formData.append("expenseDate", this.expenseForm.date);
    formData.append("paymentMode", this.expenseForm.mode);
    formData.append("billno", String(this.expenseForm.billno));
    formData.append("discription", this.expenseForm.description);
    formData.append("time", this.expenseForm.time);
    formData.append("hotelBranchName", this.expenseForm.branch);


    if (this.selectedExpenseImage) {
      formData.append("paymentScreenshoot", this.selectedExpenseImage);
    }
    const token = localStorage.getItem('token');

    this.http.post(
      "https://hotel-api.duckdns.org/api/admin/add/hotel-expense",
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    ).subscribe({
      next: () => {
        this.showAddExpenseForm = false;
        this.showToast("Expense added successfully!");
        this.getHotelExpenseReport();
      },
    });
  }

  addEarning() {
    const formData = new FormData();
    formData.append("earningAmount", String(this.earningForm.amount));
    formData.append("earningDetails", this.earningForm.details);
    formData.append("earningDate", this.earningForm.date);
    formData.append("paymentMode", this.earningForm.mode);
    formData.append("billno", String(this.earningForm.billno));  // BILL NO
    formData.append("discription", this.earningForm.description);
    formData.append("time", this.earningForm.time);
    formData.append("hotelBranchName", this.earningForm.branch);



    if (this.selectedEarningImage) {
      formData.append("paymentScreenshoot", this.selectedEarningImage);
    }
    const token = localStorage.getItem('token');
    this.http.post(
      "https://hotel-api.duckdns.org/api/admin/add/hotel-earning",
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    ).subscribe({
      next: () => {
        this.showToast("Earning added successfully!");
        this.showAddEarningForm = false;
        this.getHotelExpenseReport();
      },
    });
  }

  suppliers: any[] = [];
  filteredSuppliers: any[] = [];
  supplierSearchText: string = "";
  showSupplierForm: boolean = false;
  supplierForm = {
    supplierName: "",
    supplierCompany: "",
    supplierPhone: ""
  };

  // GET SUPPLIERS LIST
  getSuppliers() {
    this.http.get("https://hotel-api.duckdns.org/api/admin/get/supplier-persons", this.getHeaders())
      .subscribe({
        next: (res: any) => {
          if (Array.isArray(res?.data)) {
            this.suppliers = res.data;
          }
          else if (Array.isArray(res)) {
            this.suppliers = res;
          }
          else {
            this.suppliers = [];
          }

          this.filteredSuppliers = [...this.suppliers];
        },
      });
  }

  filterSuppliers() {
    const t = this.supplierSearchText.toLowerCase().trim();
    this.filteredSuppliers = this.suppliers.filter(s =>
      s.supplierName?.toLowerCase().includes(t) ||
      s.supplierCompany?.toLowerCase().includes(t) ||
      s.supplierPhone?.toLowerCase().includes(t)
    );
  }

  // OPEN FORM
  openSupplierForm() {
    this.showSupplierForm = true;
  }

  // CLOSE FORM
  closeSupplierForm() {
    this.showSupplierForm = false;
    this.supplierForm = {
      supplierName: "",
      supplierCompany: "",
      supplierPhone: ""
    };
  }

  // SUBMIT SUPPLIER
  submitSupplier() {
    const payload = {
      supplierName: this.supplierForm.supplierName,
      supplierCompany: this.supplierForm.supplierCompany,
      supplierPhone: this.supplierForm.supplierPhone
    };

    this.http.post("https://hotel-api.duckdns.org/api/admin/add/supplier-person", payload, this.getHeaders())
      .subscribe({
        next: () => {

          this.closeSupplierForm();
          this.getSuppliers();
        },
      });
  }
  openSupplierProfile(id: string) {
    this.router.navigate(['/home/sprofile', id]);
  }
  showImageModal: boolean = false;
  previewImageUrl: string = '';

  openImage(url: string) {
    window.open(url, "_blank");
  }
  closeImageModal() {
    this.showImageModal = false;
  }

  confirmDelete(e: any, type: 'earnings' | 'expenses') {
    if (!e || !e._id) {
      alert('Entry ID missing');
      return;
    }
    this.deleteTarget = e;
    this.deleteType = type;
    this.showDeleteModal = true;
  }

  cancelDelete() {
    this.showDeleteModal = false;
    this.deleteTarget = null;
    this.deleteType = null;
  }

  get combinedTransactions() {
    const earnings = this.hotelEarnings.map(e => ({ ...e, type: 'earning', date: e.earningDate || e.dateTime }));
    const expenses = this.hotelExpenses.map(e => ({ ...e, type: 'expense', date: e.expenseDate || e.dateTime }));

    return [...earnings, ...expenses].sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }

  executeDelete() {
    if (!this.deleteTarget || !this.deleteType) return;

    const token = localStorage.getItem('token') || '';
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    const payload = {
      type: this.deleteType,
      objId: this.deleteTarget._id
    };

    this.http.request(
      'DELETE',
      'https://hotel-api.duckdns.org/api/admin/delete/earning-expense-entry',
      {
        body: payload,
        headers
      }
    ).subscribe({
      next: () => {
        this.showToast("Entry deleted successfully!");
        this.cancelDelete();
        this.getHotelExpenseReport(); // refresh
      },
      error: (err) => {
        this.showToast(err.error?.message || 'Delete failed', 'error');
        this.cancelDelete();
      }
    });
  }
}
