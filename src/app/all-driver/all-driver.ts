import { Component } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-all-driver',
  templateUrl: './all-driver.html',
  styleUrls: ['./all-driver.scss']
})
export class AllDriver {
  drivers: any[] = [];
  filteredDrivers: any[] = [];

  fromDate: string = '';
  toDate: string = '';
  entryFilter: string = '';
  searchTerm: string = '';

  entryRanges = ['5-10', '10-15', '15-20', '20-25', '25-30', '30-40'];
  branchFilter: string = '';
  entryFromDate: string = '';
  entryToDate: string = '';

  branches = ['Gokulpurabranch', 'Sikarbranch', 'Sanwalibranch'];

  allEntries: any[] = [];

  reminderMessage: string =
    'नमस्ते, {name} जी आपका सहयोग हमारे लिए हमेशा मूल्यवान रहा है जब भी आप किसी पार्टी के साथ इस ओर आएं BL Poonam Hotel & Restaurant में रुकने का अवसर ज़रूर दें आपकी हर यात्रा सुखद और सफल रहे यही हमारी शुभकामनाएँ हैं (टीम BL Poonam Hotel & Restaurant)';

  constructor(private http: HttpClient, private router: Router) { }

  ngOnInit(): void {
    this.getDrivers();
    this.getAllCommissionEntries(); // ✅ Fetch all entries once
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getHeaders() {
    const token = this.getToken();
    if (!token) this.router.navigate(['/login']);
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
  }

  getDrivers() {
    this.http
      .get<any>('https://hotel-api.duckdns.org/api/admin/get-drivers', {
        headers: this.getHeaders(),
      })
      .subscribe({
        next: (res) => {
          let list = res.drivers || [];
          this.drivers = list.map((d: any) => ({
            ...d,
            name: d.name,
            entries: [], // ✅ Initialize empty entries array
            totalEntries: 0,
            branchEntryCount: 0
          }));
          this.filteredDrivers = this.drivers;

          // ✅ If entries are already loaded, calculate immediately
          if (this.allEntries.length > 0) {
            this.calculateDriverEntries();
          }
        },
        error: (err) => console.error(err),
      });
  }

  getDriverEntries(driver: any) {
    console.log("entry");

    this.http
      .get<any>('https://hotel-api.duckdns.org/api/admin/get-driver-commision-entries', {
        headers: this.getHeaders(),
      })
      .subscribe({
        next: (res) => {
          const allEntries = res.entries || [];

          // 🔥 Defensive filtering: Handle both MongoDB ObjectId AND driver codes
          const driverEntries = allEntries.filter((e: any) => {
            const primaryMatch = e.driverId === driver._id;
            const fallbackMatch = e.driverId === driver.driverId;

            if (!primaryMatch && fallbackMatch) {
              console.warn('⚠️ Old commission format detected:', {
                entryId: e.entryId,
                driverId: e.driverId
              });
            }

            return primaryMatch || fallbackMatch;
          });

          driver.totalEntries = driverEntries.length;
          if (driverEntries.length > 0) {
            const latest = driverEntries
              .map((x: any) => new Date(x.entryDate))
              .sort((a: Date, b: Date) => b.getTime() - a.getTime())[0];

            driver.latestEntryDate = latest;
          }

          this.applyFilters();
        },
        error: (err) =>
          console.error('Commission entries fetch error:', err),
      });
  }

  // 🔥 Filters
  applyFilters() {
    this.filteredDrivers = this.drivers.filter((d) => {
      let dateCheck = true;
      let entryCheck = true;
      let searchCheck = true;

      // Search by name or mobile
      if (this.searchTerm) {
        const term = this.searchTerm.toLowerCase();
        searchCheck =
          (d.name && d.name.toLowerCase().includes(term)) ||
          (d.mobile && d.mobile.toLowerCase().includes(term));
      }

      // Date filter
      if (this.fromDate && this.toDate && d.createdAt) {
        const date = new Date(d.createdAt);
        dateCheck =
          date >= new Date(this.fromDate) &&
          date <= new Date(this.toDate);
      }

      // Entry count filter
      if (this.entryFilter) {
        const [min, max] = this.entryFilter.split('-').map(Number);
        entryCheck =
          (d.totalEntries || 0) >= min &&
          (d.totalEntries || 0) <= max;
      }

      return dateCheck && entryCheck && searchCheck;
    });
  }

  // 🔥 WhatsApp Reminder
  sendWhatsAppReminder(driver: any) {
    if (!driver.mobile) {
      alert('Driver mobile number missing!');
      return;
    }

    const phone = driver.mobile.startsWith('+')
      ? driver.mobile
      : '91' + driver.mobile;

    const msg = this.reminderMessage.replace('{name}', driver.name);

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  }
  getAllCommissionEntries() {
    this.http
      .get<any>('https://hotel-api.duckdns.org/api/admin/get-driver-commision-entries', {
        headers: this.getHeaders(),
      })
      .subscribe({
        next: (res) => {
          this.allEntries = res.entries || [];
          this.calculateDriverEntries();
        },
        error: (err) => console.error(err),
      });
  }

  calculateDriverEntries() {
    this.drivers.forEach((driver) => {
      // 🔥 Defensive filtering: Handle both MongoDB ObjectId AND driver codes
      const entries = this.allEntries.filter((e) => {
        // Primary check: driverId matches MongoDB _id (correct format)
        const primaryMatch = e.driverId === driver._id;

        // Fallback check: driverId might contain driver code in old records
        const fallbackMatch = e.driverId === driver.driverId;

        // 🚨 Log warning if fallback is used (indicates old/wrong data)
        if (!primaryMatch && fallbackMatch) {
          console.warn('⚠️ Found commission entry with driver code instead of ObjectId:', {
            entryId: e.entryId,
            driverId: e.driverId,
            expectedObjectId: driver._id,
            driverCode: driver.driverId
          });
        }

        return primaryMatch || fallbackMatch;
      });

      driver.totalEntries = entries.length;
      driver.entries = entries; // ✅ Store all entries for this driver
    });

    this.applyBranchFilter(); // ✅ Apply filter after calculating
  }

  applyBranchFilter() {
    this.filteredDrivers = this.drivers
      .map((driver) => {
        // Create a copy to avoid mutating original
        const driverCopy = { ...driver };
        let entries = [...(driver.entries || [])];

        // ✅ Branch filter
        if (this.branchFilter) {
          entries = entries.filter(
            (e: any) => e.branchName === this.branchFilter
          );
        }

        // ✅ Date filter (ONLY if both dates selected)
        if (this.entryFromDate && this.entryToDate) {
          const from = new Date(this.entryFromDate);
          const to = new Date(this.entryToDate);
          to.setHours(23, 59, 59, 999); // full day include

          entries = entries.filter((e: any) => {
            const d = new Date(e.entryDate);
            return d >= from && d <= to;
          });
        }

        // ✅ Set branch-specific entry count
        driverCopy.branchEntryCount = entries.length;

        return driverCopy;
      })
      .filter((driver) => {
        // ✅ Show driver if:
        // 1. No filters applied (show all)
        // 2. Or has entries matching the filter
        const hasFilters = this.branchFilter || (this.entryFromDate && this.entryToDate);
        return !hasFilters || driver.branchEntryCount > 0;
      });
  }



}
