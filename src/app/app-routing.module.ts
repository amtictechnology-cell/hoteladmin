import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { HomeComponent } from './home/home.component';
import { AdminComponent } from './admin/admin.component';
import { DriverListComponent } from './driver-list/driver-list.component';
import { DlistComponent } from './dlist/dlist.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { AllDriver } from './all-driver/all-driver';
import { Staffprofile } from './staffprofile/staffprofile';
import { Attendance } from './attendance/attendance';
import { Allattendance } from './allattendance/allattendance';
import { Expensis } from './expensis/expensis';
import { Cprofile } from './cprofile/cprofile';
import { Sprofile } from './sprofile/sprofile';
import { Khatabook } from './khatabook/khatabook';
import { Khatabookprofile } from './khatabookprofile/khatabookprofile';
import { Pcustomer } from './pcustomer/pcustomer';
import { Pcprofile } from './pcprofile/pcprofile';
import { AllCheque } from './all-cheque/all-cheque';
import { Logout } from './logout/logout';
import { Notes } from './notes/notes';






const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  {
    path: 'home',
    component: HomeComponent,
    children: [
      { path: '', component: DashboardComponent },
      { path: 'admin', component: AdminComponent },
      { path: 'dlist', component: DriverListComponent },
      { path: 'list/:id', component: DlistComponent },
      { path: 'all-driver', component: AllDriver },
      { path: 'staff/:id', component: Staffprofile },
      { path: 'attendance', component: Attendance },
      { path: 'allattendance', component: Allattendance },
      { path: 'expensis', component: Expensis },
      { path: 'cprofile/:id', component: Cprofile },
      { path: 'sprofile/:id', component: Sprofile },
      { path: 'khatabook', component: Khatabook },
      { path: 'khatabookprofile/:id', component: Khatabookprofile },
      { path: 'pcustomer', component: Pcustomer },
      { path: 'pcprofile/:id', component: Pcprofile },
      { path: 'all-cheque', component: AllCheque },
      { path: 'logout', component: Logout },
      { path: 'notes', component: Notes }

    ]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
