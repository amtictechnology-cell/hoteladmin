import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { HttpHeaders } from '@angular/common/http';
import { forkJoin } from 'rxjs';
@Component({
  selector: 'app-all-cheque',
  templateUrl: './all-cheque.html',
  styleUrls: ['./all-cheque.scss']
})
export class AllCheque implements OnInit {
  loading = true;

  allCheques: any[] = [];
  filteredCheques: any[] = [];

  branches: string[] = [];
  years: number[] = [];

  selectedBranch: string = 'ALL';
  selectedMonth: number | '' = '';
  selectedYear: number | '' = '';

  totalTakenCheque = 0;
  totalGivenCheque = 0;
  totalChequeAmount = 0;
  finalBalance = 0;

  constructor(private http: HttpClient) { }

  ngOnInit() {
    this.loadAllSupplierCheques();
  }

  /* ================= MAIN LOGIC ================= */
  loadAllSupplierCheques() {
    const token = localStorage.getItem('token') || '';
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    // 1️⃣ Get all suppliers
    this.http.get<any>(
      'https://hotel-api.duckdns.org/api/admin/get/supplier-persons',
      { headers }
    ).subscribe(res => {

      const suppliers = res.data || [];
      const calls: any[] = [];

      // 2️⃣ Create API calls for each supplier
      suppliers.forEach((s: any) => {
        calls.push(
          this.http.get<any>(
            `https://hotel-api.duckdns.org/api/admin/get/supplier-transection?supplierId=${s.supplierId}`,
            { headers }
          )
        );
      });

      // 3️⃣ Execute all APIs together
      forkJoin(calls).subscribe(results => {
        const temp: any[] = [];

        results.forEach((res: any) => {
          const data = res.data;
          if (!data) return;

          // 🔴 TAKEN CHEQUES
          data.takenFromAdmin
            ?.filter((t: any) => t.paymentMode === 'cheque')
            .forEach((t: any) => {
              temp.push({
                supplierId: data.supplierId,
                supplierName: data.supplierName || '',
                branch: t.hotelBranchName,
                amount: t.Rs,
                type: 'TAKEN',
                entryDate: t.updatedAt,
                returnDate: t.returnDate
              });
            });

          // 🟢 GIVEN CHEQUES
          data.givenToAdmin
            ?.filter((t: any) => t.paymentMode === 'cheque')
            .forEach((t: any) => {
              temp.push({
                supplierId: data.supplierId,
                supplierName: data.supplierName || '',
                branch: t.hotelBranchName,
                amount: t.Rs,
                type: 'GIVEN',
                entryDate: t.updatedAt,
                returnDate: t.returnDate
              });
            });
        });

        this.allCheques = temp;
        this.prepareFilters();
        this.applyFilters();
        this.loading = false;
      });
    });
  }

  /* ================= FILTER SETUP ================= */
  prepareFilters() {
    this.branches = Array.from(
      new Set(this.allCheques.map(c => c.branch).filter(Boolean))
    );

    this.years = Array.from(
      new Set(this.allCheques.map(c => new Date(c.entryDate).getFullYear()))
    ).sort((a, b) => b - a);
  }

  applyFilters() {
    let data = [...this.allCheques];

    if (this.selectedBranch !== 'ALL') {
      data = data.filter(d => d.branch === this.selectedBranch);
    }

    if (this.selectedMonth !== '') {
      data = data.filter(
        d => new Date(d.entryDate).getMonth() === this.selectedMonth
      );
    }

    if (this.selectedYear !== '') {
      data = data.filter(
        d => new Date(d.entryDate).getFullYear() === this.selectedYear
      );
    }

    this.filteredCheques = data;
    this.calculateSummary();
  }

  /* ================= SUMMARY ================= */
  calculateSummary() {
    this.totalTakenCheque = this.filteredCheques
      .filter(c => c.type === 'TAKEN')
      .reduce((s, c) => s + c.amount, 0);

    this.totalGivenCheque = this.filteredCheques
      .filter(c => c.type === 'GIVEN')
      .reduce((s, c) => s + c.amount, 0);

    this.totalChequeAmount =
      this.totalTakenCheque + this.totalGivenCheque;

    this.finalBalance =
      this.totalTakenCheque - this.totalGivenCheque;
  }
}
