import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { forkJoin } from 'rxjs';

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

  // 🔹 Date Filter
  startDate: string = '';
  endDate: string = '';

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
    this.loadDriverAndCommissions();
  }

  getHeaders() {
    const token = localStorage.getItem('token');
    if (!token) this.router.navigate(['/login']);

    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // 🔹 Load Driver + Commissions together using forkJoin
  loadDriverAndCommissions() {
    const driver$ = this.http.get<any>(
      'https://hotel-api.duckdns.org/api/admin/get-drivers',
      { headers: this.getHeaders() }
    );

    const commissions$ = this.http.get<any>(
      'https://hotel-api.duckdns.org/api/admin/get-driver-commision-entries',
      { headers: this.getHeaders() }
    );

    forkJoin([driver$, commissions$]).subscribe({
      next: ([driverRes, commissionRes]) => {
        // 1. First, get the driver (guaranteed to be available)
        this.driver = driverRes.drivers.find((d: any) => d._id === this.driverId);
        if (!this.driver) {
          this.router.navigate(['/dlist']);
          return;
        }

        // 2. Now filter commissions (driver is guaranteed to be loaded)
        const entries = commissionRes.entries || [];
        this.allCommissions = entries.filter((e: any) => {
          // Primary check: driverId matches MongoDB _id (correct format)
          const matchById = e.driverId === this.driver._id;

          // Fallback check: driverId might contain driver code in old records
          const matchByCode = e.driverId === this.driver.driverId;

          // 🚨 Log warning if fallback is used (indicates old/wrong data)
          if (!matchById && matchByCode) {
            console.warn('⚠️ Found commission entry with driver code instead of ObjectId:', {
              entryId: e.entryId,
              driverId: e.driverId,
              expectedObjectId: this.driver._id,
              driverCode: this.driver.driverId
            });
          }

          return matchById || matchByCode;
        });

        this.commissions = [...this.allCommissions];

        // 🔥 Calculate branch statistics
        this.calculateBranchStats();

        // 🔍 Debug log to verify data consistency
        console.log('✅ Commission entries loaded:', {
          total: this.allCommissions.length,
          driverMongoId: this.driver._id,
          driverCode: this.driver.driverId
        });
      },
      error: (err) => {
        if (err.status === 401) this.router.navigate(['/login']);
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

  // 🔹 Date Range Filter
  filterByDateRange() {
    if (!this.startDate && !this.endDate) {
      this.commissions = [...this.allCommissions];
    } else {
      this.commissions = this.allCommissions.filter(entry => {
        const entryDate = new Date(entry.entryDate || entry.createdAt).getTime();

        // Reset hours for date-only comparison
        const start = this.startDate ? new Date(this.startDate).setHours(0, 0, 0, 0) : null;
        const end = this.endDate ? new Date(this.endDate).setHours(23, 59, 59, 999) : null;

        const startMatch = !start || entryDate >= start;
        const endMatch = !end || entryDate <= end;

        return startMatch && endMatch;
      });
    }

    // 🔥 Update branch stats after filtering
    this.calculateBranchStats();
  }

  // 🔹 Reset Filters
  resetFilters() {
    this.startDate = '';
    this.endDate = '';
    this.commissions = [...this.allCommissions];
    this.calculateBranchStats();
  }
  addCommission() {
    if (!this.driver) return;

    const payload = {
      driverId: this.driver.driverId, // ✅ DRIVER CODE
      partyAmount: Number(this.newCommission.partyAmount),
      driverCommisionAmount: Number(this.newCommission.driverCommisionAmount),
      status: this.newCommission.status,
      description: this.newCommission.description,
    };

    console.log('📤 Correct Payload:', payload);

    this.http.post(
      'https://hotel-api.duckdns.org/api/admin/add-driver-commision-entry',
      payload,
      { headers: this.getHeaders() }
    ).subscribe({
      next: () => {
        this.resetForm();
        this.loadDriverAndCommissions();
        this.showToast('success', 'Commission Entry Added Successfully!');
      },
      error: (err) => {
        if (err.status === 500) {
          // 🔥 entry save ho chuki hoti hai
          this.resetForm();
          this.loadDriverAndCommissions();
          this.showToast('success', 'Entry added (server response issue)');
        } else {
          this.showToast('error', 'Failed to add entry!');
        }
      }
    });

  }

  resetForm() {
    this.newCommission = {
      partyAmount: '',
      driverCommisionAmount: '',
      status: 'Pending',
      description: '',
    };
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
        this.loadDriverAndCommissions();
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
