import { Component } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent {
  staffList: any[] = [];
  filteredStaff: any[] = [];
  searchTerm: string = '';
  selectedBranch: string = '';

  totalStaff = 0;
  gokulpuraCount = 0;
  sikarCount = 0;
  sanwaliCount = 0;


  showModal = false;
  isEditMode = false;

  // files
  profileImageFile: File | null = null;
  idProofFrontFile: File | null = null;
  idProofBackFile: File | null = null;

  // previews (optional)
  profileImagePreview: string | null = null;
  idProofFrontPreview: string | null = null;
  idProofBackPreview: string | null = null;

  newStaff: any = {
    staffId: '',
    firstName: '',
    lastName: '',
    mobile: '',
    adharNumber: '',
    DOB: '',
    role: 'staff',
    address: { city: '', state: '' },
    branchName: '',
    salary: '',
  };

  // 🔥 Toast Notification
  toast = {
    show: false,
    message: '',
    type: '' as 'success' | 'error' | 'info'
  };

  constructor(private http: HttpClient, private router: Router) { }

  ngOnInit() {
    this.getStaffList();
  }

  // ================= LIST =================
  getStaffList() {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`
    });

    this.http.get<any>(
      'https://hotel-api.duckdns.org/api/admin/staff/get-list',
      { headers }
    ).subscribe(res => {
      this.staffList = res.staffList;
      this.filteredStaff = res.staffList;

      // ✅ total staff
      this.totalStaff = this.staffList.length;

      // ✅ reset counts
      this.gokulpuraCount = 0;
      this.sikarCount = 0;
      this.sanwaliCount = 0;

      // ✅ branch wise count
      this.staffList.forEach((s: any) => {
        if (s.branchName === 'Gokulpura') this.gokulpuraCount++;
        if (s.branchName === 'Sikar') this.sikarCount++;
        if (s.branchName === 'Sanwali') this.sanwaliCount++;
      });
    });
  }

  searchStaff() {
    const s = this.searchTerm.toLowerCase();

    this.filteredStaff = this.staffList.filter(x => {
      const matchSearch =
        x.firstName.toLowerCase().includes(s) ||
        x.mobile.includes(s);

      const matchBranch =
        !this.selectedBranch || x.branchName === this.selectedBranch;

      return matchSearch && matchBranch;
    });
  }


  // ================= MODAL =================
  openAddModal() {
    this.resetForm();
    this.isEditMode = false;
    this.showModal = true;
    this.profileImagePreview = null;
    this.idProofFrontPreview = null;
    this.idProofBackPreview = null;
    this.profileImageFile = null;
    this.idProofFrontFile = null;
    this.idProofBackFile = null;
  }

  openEditModal(staff: any) {
    this.isEditMode = true;
    this.showModal = true;
    this.newStaff = JSON.parse(JSON.stringify(staff));

    // 🔹 Do NOT show old images, only allow select new ones
    this.profileImagePreview = null;
    this.idProofFrontPreview = null;
    this.idProofBackPreview = null;

    this.profileImageFile = null;
    this.idProofFrontFile = null;
    this.idProofBackFile = null;
  }

  closeModal() {
    this.showModal = false;
    this.profileImagePreview = null;
    this.idProofFrontPreview = null;
    this.idProofBackPreview = null;
  }

  // ================= IMAGE SELECT =================
  onProfileImageSelect(e: any) {
    if (e.target.files && e.target.files.length > 0) {
      const file: File = e.target.files[0];
      this.profileImageFile = file;

      const reader = new FileReader();
      reader.onload = () => {
        this.profileImagePreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  onIdProofFrontSelect(e: any) {
    if (e.target.files && e.target.files.length > 0) {
      const file: File = e.target.files[0];
      this.idProofFrontFile = file;

      const reader = new FileReader();
      reader.onload = () => {
        this.idProofFrontPreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  onIdProofBackSelect(e: any) {
    if (e.target.files && e.target.files.length > 0) {
      const file: File = e.target.files[0];
      this.idProofBackFile = file;

      const reader = new FileReader();
      reader.onload = () => {
        this.idProofBackPreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  // ================= ADD =================
  addStaff() {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`
    });

    const fd = new FormData();
    fd.append('firstName', this.newStaff.firstName);
    fd.append('lastName', this.newStaff.lastName);
    fd.append('mobile', this.newStaff.mobile);
    fd.append('adharNumber', this.newStaff.adharNumber);
    fd.append('role', 'staff');
    fd.append('branchName', this.newStaff.branchName);
    fd.append('salary', this.newStaff.salary);
    if (this.newStaff.DOB) fd.append('DOB', this.newStaff.DOB);
    fd.append('address[city]', this.newStaff.address.city || '');
    fd.append('address[state]', this.newStaff.address.state || '');
    fd.append('address[country]', '');

    if (this.profileImageFile) fd.append('profileImage', this.profileImageFile);
    if (this.idProofFrontFile) {
      fd.append('IdProofFront', this.idProofFrontFile);
      fd.append('IdProofImage', this.idProofFrontFile); // Send to original key for backend triggers
    }
    if (this.idProofBackFile) fd.append('IdProofBack', this.idProofBackFile);

    this.http.post(
      'https://hotel-api.duckdns.org/api/admin/staff/add',
      fd,
      { headers }
    ).subscribe({
      next: () => {
        this.getStaffList();
        this.closeModal();
        this.showToast('success', '✓ Staff Added Successfully!');
      },
      error: () => {
        this.showToast('error', '✗ Failed to Add Staff');
      }
    });
  }

  updateStaff() {
    console.log(' Update Staff Clicked');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`
    });

    const fd = new FormData();
    fd.append('staffId', this.newStaff.staffId);
    fd.append('firstName', this.newStaff.firstName);
    fd.append('lastName', this.newStaff.lastName);
    fd.append('mobile', this.newStaff.mobile);
    fd.append('branchName', this.newStaff.branchName);
    fd.append('salary', this.newStaff.salary);
    fd.append('address[city]', this.newStaff.address.city || '');
    fd.append('address[state]', this.newStaff.address.state || '');
    fd.append('address[country]', '');

    if (this.profileImageFile) fd.append('profileImage', this.profileImageFile);
    if (this.idProofFrontFile) {
      fd.append('IdProofFront', this.idProofFrontFile);
      fd.append('IdProofImage', this.idProofFrontFile);
    }
    if (this.idProofBackFile) fd.append('IdProofBack', this.idProofBackFile);

    this.http.patch(
      'https://hotel-api.duckdns.org/api/admin/staff/update-profile',
      fd,
      { headers }
    ).subscribe({
      next: () => {
        console.log("Done");
        this.getStaffList();
        this.closeModal();
        this.showToast('success', '✓ Staff Updated Successfully!');
      },
      error: () => {
        this.showToast('error', '✗ Failed to Update Staff');
      }
    });
  }

  // 🔥 Show Toast Notification
  showToast(type: 'success' | 'error' | 'info', message: string) {
    this.toast.type = type;
    this.toast.message = message;
    this.toast.show = true;

    setTimeout(() => {
      this.toast.show = false;
    }, 1000); // ✅ 1 second timing
  }

  resetForm() {
    this.newStaff = {
      staffId: '',
      firstName: '',
      lastName: '',
      mobile: '',
      adharNumber: '',
      DOB: '',
      role: 'staff',
      address: { city: '', state: '' },
      branchName: '',
      salary: '',
    };
    this.profileImageFile = null;
    this.idProofFrontFile = null;
    this.idProofBackFile = null;
    this.profileImagePreview = null;
    this.idProofFrontPreview = null;
    this.idProofBackPreview = null;
  }

  goToProfile(id: string) {
    this.router.navigate(['/home/staff', id]);
  }
  filterByBranch(branch: string) {
    this.selectedBranch = branch;

    if (!branch) {
      // 🔹 Total Staff
      this.filteredStaff = [...this.staffList];
      return;
    }

    this.filteredStaff = this.staffList.filter(
      s => s.branchName === branch
    );
  }

}
