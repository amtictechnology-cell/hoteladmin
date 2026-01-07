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

  branches = ['Gokulpurabranch', 'Sikarbranch', 'Sanwalibranch'];
  branchStats: Record<string, number> = {
    Gokulpurabranch: 0,
    Sikarbranch: 0,
    Sanwalibranch: 0
  };
  totalEntries = 0;

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
      'https://hotel-api.duckdns.org/api/admin/get-drivers',
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
      'https://hotel-api.duckdns.org/api/admin/get-driver-commision-entries',
      { headers: this.getHeaders() }
    ).subscribe({
      next: (res) => {
        const entries = res.entries || [];

        // 🔥 Defensive filtering: Handle both MongoDB ObjectId AND driver codes
        this.allCommissions = entries.filter((e: any) => {
          // Primary check: driverId matches MongoDB _id (correct format)
          const primaryMatch = e.driverId === this.driverId;

          // Fallback check: driverId might contain driver code in old records
          const fallbackMatch = this.driver && e.driverId === this.driver.driverId;

          // 🚨 Log warning if fallback is used (indicates old/wrong data)
          if (!primaryMatch && fallbackMatch) {
            console.warn('⚠️ Found commission entry with driver code instead of ObjectId:', {
              entryId: e.entryId,
              driverId: e.driverId,
              expectedObjectId: this.driverId,
              driverCode: this.driver?.driverId
            });
          }

          return primaryMatch || fallbackMatch;
        });

        this.commissions = [...this.allCommissions];

        // 🔥 Auto generate year list
        const yearSet = new Set<number>();
        this.allCommissions.forEach(e => {
          yearSet.add(new Date(e.entryDate).getFullYear());
        });
        this.years = Array.from(yearSet).sort((a, b) => b - a);

        // 🔥 Calculate branch statistics
        this.calculateBranchStats();

        // 🔍 Debug log to verify data consistency
        console.log('✅ Commission entries loaded:', {
          total: this.allCommissions.length,
          driverMongoId: this.driverId,
          driverCode: this.driver?.driverId
        });
      }
    });
  }

  // 🔹 Calculate Branch Statistics
  calculateBranchStats() {
    // Reset counts
    this.branchStats = {
      Gokulpurabranch: 0,
      Sikarbranch: 0,
      Sanwalibranch: 0
    };

    // Use filtered commissions instead of allCommissions
    this.totalEntries = this.commissions.length;

    // Count entries per branch from filtered data
    this.commissions.forEach(entry => {
      const branch = entry.branchName;
      if (branch in this.branchStats) {
        this.branchStats[branch as keyof typeof this.branchStats]++;
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

    // 🔥 Update branch stats after filtering
    this.calculateBranchStats();
  }

  // 🔹 Add Commission
  addCommission() {
    if (!this.driver) return;

    const payload = {
      driverId: this.driverId, // ✅ This should be MongoDB _id
      partyAmount: this.newCommission.partyAmount,
      driverCommisionAmount: this.newCommission.commissionAmount,
      status: this.newCommission.status,
      description: this.newCommission.description,
    };

    // 🔍 Debug: Verify we're sending the correct ID
    console.log('📤 Adding commission with payload:', {
      driverId: payload.driverId,
      driverCode: this.driver.driverId,
      partyAmount: payload.partyAmount
    });

    this.http.post(
      'https://hotel-api.duckdns.org/api/admin/add-driver-commision-entry',
      payload,
      { headers: this.getHeaders() }
    ).subscribe({
      next: (res: any) => {
        if (res.entry) {
          // 🔍 Verify the response contains correct driverId format
          if (res.entry.driverId !== this.driverId) {
            console.warn('⚠️ Backend returned different driverId format!', {
              sent: this.driverId,
              received: res.entry.driverId
            });
          }

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
      `https://hotel-api.duckdns.org/api/admin/edit-driver-commision-entry`,
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
