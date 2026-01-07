import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './login/login.component';
import { HomeComponent } from './home/home.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AdminComponent } from './admin/admin.component';
import { HttpClientModule } from '@angular/common/http';
import { DriverListComponent } from './driver-list/driver-list.component';
import { DlistComponent } from './dlist/dlist.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { AllDriver } from './all-driver/all-driver';
import { Staffprofile } from './staffprofile/staffprofile';
import { Attendance } from './attendance/attendance';
import { Allattendance } from './allattendance/allattendance';
import { CommonModule } from '@angular/common';
import { Expensis } from './expensis/expensis';
import { Cprofile } from './cprofile/cprofile';
import { Sprofile } from './sprofile/sprofile';
import { Khatabook } from './khatabook/khatabook';
import { Khatabookprofile } from './khatabookprofile/khatabookprofile';
import { Pcustomer } from './pcustomer/pcustomer';
import { Pcprofile } from './pcprofile/pcprofile';
import { AllCheque } from './all-cheque/all-cheque';
import { Logout } from './logout/logout';
import { LocationStrategy, PathLocationStrategy } from '@angular/common';




@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    HomeComponent,
    AdminComponent,
    DriverListComponent,
    DlistComponent,
    DashboardComponent,
    AllDriver,
    Staffprofile,
    Attendance,
    Allattendance,
    Expensis,
    Cprofile,
    Sprofile,
    Khatabook,
    Khatabookprofile,
    Pcustomer,
    Pcprofile,
    AllCheque,
    Logout

  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    HttpClientModule,
    ReactiveFormsModule,
    CommonModule
  ],
  providers: [ { provide: LocationStrategy, useClass: PathLocationStrategy }],
  bootstrap: [AppComponent]
})
export class AppModule { }
