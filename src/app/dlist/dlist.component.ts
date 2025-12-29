import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-dlist',
  templateUrl: './dlist.component.html',
  styleUrls: ['./dlist.component.scss'],
})
export class DlistComponent implements OnInit {
  driverId: string = '';
  driver: any = null;

  // 🔹 Commission Data
  allCommissions: any[] = [];
  commissions: any[] = [];

  // 🔹 Add Commission
  newCommission: any = {
    partyAmount: '',
    commissionAmount: '',
    status: 'Pending',
    description: '',
  };

  // 🔹 Edit Modal
  editModal = false;
  editCommission: any = {};

  // 🔹 Month / Year Filter
  selectedMonth: string | number = '';
  selectedYear: string | number = '';

  months = [
    'January', 'February', 'March', 'April',
    'May', 'June', 'July', 'August',
    'September', 'October', 'November', 'December'
  ];

  years: number[] = [];

  // 🔹 Toast
  toast = {
    show: false,
    message: '',
    type: ''
  };

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.driverId = this.route.snapshot.paramMap.get('id') || '';
    this.getDriver();
    this.getCommissionEntries();
  }

  getHeaders() {
    const token = localStorage.getItem('token');
    if (!token) this.router.navigate(['/login']);

    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // 🔹 Driver Detail
  getDriver() {
    this.http.get<any>(
      'http://localhost:5000/api/admin/get-drivers',
      { headers: this.getHeaders() }
    ).subscribe({
      next: (res) => {
        this.driver = res.drivers.find((d: any) => d._id === this.driverId);
        if (!this.driver) this.router.navigate(['/dlist']);
      },
      error: (err) => {
        if (err.status === 401) this.router.navigate(['/login']);
      }
    });
  }

  // 🔹 Get Commission Entries
  getCommissionEntries() {
    this.http.get<any>(
      'http://localhost:5000/api/admin/get-driver-commision-entries',
      { headers: this.getHeaders() }
    ).subscribe({
      next: (res) => {
        const entries = res.entries || [];
        this.allCommissions = entries.filter(
          (e: any) => e.driverId === this.driverId
        );

        this.commissions = [...this.allCommissions];

        // 🔥 Auto generate year list
        const yearSet = new Set<number>();
        this.allCommissions.forEach(e => {
          yearSet.add(new Date(e.entryDate).getFullYear());
        });
        this.years = Array.from(yearSet).sort((a, b) => b - a);
      }
    });
  }

  // 🔹 Month + Year Filter
  filterByMonthYear() {
    this.commissions = this.allCommissions.filter(entry => {
      const d = new Date(entry.entryDate);

      const monthMatch =
        this.selectedMonth === '' ||
        d.getMonth() === Number(this.selectedMonth);

      const yearMatch =
        this.selectedYear === '' ||
        d.getFullYear() === Number(this.selectedYear);

      return monthMatch && yearMatch;
    });
  }

  // 🔹 Add Commission
  addCommission() {
    if (!this.driver) return;

    const payload = {
      driverId: this.driverId,
      partyAmount: this.newCommission.partyAmount,
      driverCommisionAmount: this.newCommission.commissionAmount,
      status: this.newCommission.status,
      description: this.newCommission.description,
    };

    this.http.post(
      'http://localhost:5000/api/admin/add-driver-commision-entry',
      payload,
      { headers: this.getHeaders() }
    ).subscribe({
      next: (res: any) => {
        if (res.entry) {
          this.allCommissions.unshift(res.entry);
          this.filterByMonthYear();
        }
        this.newCommission = {
          partyAmount: '',
          commissionAmount: '',
          status: 'Pending',
          description: '',
        };
        this.showToast('success', 'Commission Entry Added Successfully!');
      },
      error: () => {
        this.showToast('error', 'Failed to add entry!');
      }
    });
  }

  // 🔹 Edit Commission
  openEditModal(entry: any) {
    this.editCommission = { ...entry };
    this.editModal = true;
  }

  closeEditModal() {
    this.editModal = false;
    this.editCommission = {};
  }

  updateCommission() {
    if (!this.editCommission.entryId) {
      return;
    }

    const payload = {
      entryId: this.editCommission.entryId,
      partyAmount: this.editCommission.partyAmount,
      driverCommisionAmount: this.editCommission.driverCommisionAmount,
      status: this.editCommission.status
    };

    this.http.patch(
      `http://35.198.28.86:5000/api/admin/edit-driver-commision-entry`,
      payload,
      { headers: this.getHeaders() }
    ).subscribe({
      next: (res: any) => {
        this.closeEditModal();
        this.getCommissionEntries();
        this.showToast("success", "Commission Updated Successfully!");
      },
      error: () => {
        this.showToast("error", "Update Failed!");
      }
    });
  }

  // 🔹 Toast
  showToast(type: 'success' | 'error', message: string) {
    this.toast.type = type;
    this.toast.message = message;
    this.toast.show = true;

    setTimeout(() => {
      this.toast.show = false;
    }, 2000);
  }

  // 🔹 WhatsApp Reminder
  sendWhatsAppReminder(entry: any) {
    if (!this.driver || !this.driver.mobile) return;

    const name =
      this.driver.name ||
      this.driver.driverName ||
      this.driver.fullName ||
      this.driver.firstName ||
      'Driver';

    const phone = this.driver.mobile.startsWith('+')
      ? this.driver.mobile
      : '91' + this.driver.mobile;

    const date = new Date(entry.createdAt).toLocaleDateString('hi-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    const time = new Date(entry.createdAt).toLocaleTimeString('hi-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const message = `
नमस्ते ${name} जी,  
आज (${date}, ${time}) की आपकी एंट्री की जानकारी  

*Party Amount:* ₹${entry.partyAmount}  
*Commission Amount:* ₹${entry.driverCommisionAmount}  
*Status:* ${entry.status}  

धन्यवाद  
- Bl Poonam Hotel & Restaurant
    `;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  }
}
