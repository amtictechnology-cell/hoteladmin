import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';


@Component({
  selector: 'app-driver-list',
  templateUrl: './driver-list.component.html',
  styleUrls: ['./driver-list.component.scss']
})
export class DriverListComponent implements OnInit {
  drivers: any[] = [];
  filteredDrivers: any[] = [];
  searchTerm: string = '';
  successPopup = false;
  successMessage = "";

  showModal = false;
  editModal = false;

  newDriver: any = {
    name: '',
    carNumber: '',
    mobile: '',
    email: '',
    srNumber: '',
    location: ''
  };

  editDriver: any = {};
  constructor(private http: HttpClient, private router: Router) { }

  ngOnInit() {
    const token = this.getToken();
    if (!token) {
      this.logout();
    } else {
      this.getDrivers();
    }
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  private getHeaders(): HttpHeaders {
    const token = this.getToken();
    if (!token) this.logout();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  logout() {
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }

  getDrivers() {
    this.http.get<any>('https://hotel-api.duckdns.org/api/admin/get-drivers',
      { headers: this.getHeaders() })
      .subscribe({
        next: (res: any) => {
          this.drivers = res.drivers || [];
          this.filteredDrivers = this.drivers;
        },
        error: (err) => {
          if (err.status === 401) this.logout();
        }
      });
  }

  applySearch() {
    const term = this.searchTerm.toLowerCase();
    this.filteredDrivers = this.drivers.filter(d =>
      d.name.toLowerCase().includes(term) ||
      d.carNumber.toLowerCase().includes(term) ||
      d.mobile.toLowerCase().includes(term) ||
      d.srNumber.toLowerCase().includes(term)
    );
  }


  openModal() {
    this.showModal = true;

    if (this.drivers.length > 0) {
      const maxSr = Math.max(
        ...this.drivers.map(d => Number(d.srNumber) || 0)
      );
      this.newDriver.srNumber = maxSr + 1;
    } else {
      this.newDriver.srNumber = 1;
    }
  }


  closeModal() {
    this.showModal = false;
    this.newDriver = { name: '', carNumber: '', mobile: '', email: '', srNumber: '', location: '' };
  }

  addDriver() {
    this.newDriver.carNumber = this.newDriver.carNumber.toUpperCase();
    if (!/^\d{10}$/.test(this.newDriver.mobile)) {
      return;
    }

    this.http.post('https://hotel-api.duckdns.org/api/admin/add-driver',
      this.newDriver, { headers: this.getHeaders() })
      .subscribe({
        next: (res: any) => {
          this.closeModal();
          this.getDrivers();
          this.showSuccess("Driver added successfully!");
        },
        error: (err) => {
          if (err.status === 401) this.logout();
        }
      });
  }

  openEditModal(driver: any) {
    this.editDriver = { ...driver };
    this.editModal = true;

    // 🔍 Debug: Log the driver being edited
    console.log('📝 Opening edit modal for driver:', {
      _id: driver._id,
      driverId: driver.driverId,
      name: driver.name,
      location: driver.location || '(empty)'
    });
  }

  closeEditModal() {
    this.editModal = false;
    this.editDriver = {};
  }

  updateDriver() {
    const driverId = this.editDriver.driverId;

    // Car Number uppercase
    this.editDriver.carNumber = this.editDriver.carNumber.toUpperCase();

    // Mobile number validation
    if (!/^\d{10}$/.test(this.editDriver.mobile)) {
      alert('Mobile number must be exactly 10 digits!');
      return;
    }

    const payload = {
      driverId: driverId,
      name: this.editDriver.name,
      mobile: this.editDriver.mobile,
      carNumber: this.editDriver.carNumber,
      srNumber: this.editDriver.srNumber,
      location: this.editDriver.location || '' // ✅ Ensure location is included, even if empty
    };

    // 🔍 Debug: Log the exact payload being sent
    console.log('📤 Sending update payload:', payload);
    console.log('📍 Location value being sent:', {
      value: payload.location,
      type: typeof payload.location,
      length: payload.location?.length || 0
    });

    this.http.patch(
      `https://hotel-api.duckdns.org/api/admin/edit-driver-profile`,
      payload,
      { headers: this.getHeaders() }
    ).subscribe({
      next: (res: any) => {
        // 🔍 Debug: Log the backend response
        console.log('✅ Backend response:', res);

        // 🔥 Check if location was actually updated in response
        if (res.driver && res.driver.location !== payload.location) {
          console.warn('⚠️ Location mismatch! Sent:', payload.location, 'Received:', res.driver.location);
          alert('Warning: Location may not have been updated correctly. Check backend logs.');
        }

        this.closeEditModal();
        this.getDrivers();
        this.showSuccess("Driver updated successfully!");

      },
      error: (err) => {
        console.error('❌ Update failed:', err);
        console.error('Error details:', {
          status: err.status,
          message: err.message,
          error: err.error
        });

        if (err.status === 401) this.logout();
        else alert('Update failed! Check console for details.');
      }
    });
  }
  viewDriverProfile(driverId: string) {
    this.router.navigate(['/home/list', driverId]);
  }
  showSuccess(message: string) {
    this.successMessage = message;
    this.successPopup = true;

    setTimeout(() => {
      this.successPopup = false;
    }, 1500); // 2 seconds
  }

}
