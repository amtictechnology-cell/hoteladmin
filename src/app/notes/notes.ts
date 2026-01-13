import { Component } from '@angular/core';
import { OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-notes',
  templateUrl: './notes.html',
  styleUrls: ['./notes.scss']
})
export class Notes implements OnInit {

  notesList: any[] = [];
  showModal = false;
  isEditMode = false;

  noteText = '';
  editNoteId: string | null = null;

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.getNotes();
  }

  // 🔹 COMMON HEADERS (TOKEN)
  getAuthHeaders() {
    const token = localStorage.getItem('token'); // 👈 token yahin se
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  // 🔹 GET NOTES
  getNotes() {
    this.http.get<any>(
      'https://hotel-api.duckdns.org/api/admin/notes/get/all',
      { headers: this.getAuthHeaders() }
    ).subscribe(res => {
      this.notesList = res.data || res;
    });
  }

  // 🔹 OPEN ADD MODAL
  openAddModal() {
    console.log("sfds");
    this.isEditMode = false;
    this.noteText = '';
    this.editNoteId = null;
    this.showModal = true;
  }

  // 🔹 OPEN EDIT MODAL
  openEditModal(note: any) {
    console.log("Opening edit modal for note:", note);
    this.isEditMode = true;
    this.noteText = note.note;
    this.editNoteId = note.notesId || note._id;
    this.showModal = true;
  }

  // 🔹 SAVE / UPDATE NOTE
  saveNote() {
    if (!this.noteText.trim()) return;

    if (this.isEditMode) {

      // 🔸 UPDATE NOTE
      const payload = {
        notesId: this.editNoteId,
        note: this.noteText
      };

      this.http.patch(
        'https://hotel-api.duckdns.org/api/admin/notes/update',
        payload,
        { headers: this.getAuthHeaders() }
      ).subscribe(() => {
        this.showModal = false;
        this.getNotes();
      });

    } else {

      // 🔸 ADD NOTE
      const payload = {
        note: this.noteText
      };

      this.http.post(
        'https://hotel-api.duckdns.org/api/admin/notes/add',
        payload,
        { headers: this.getAuthHeaders() }
      ).subscribe(() => {
        this.showModal = false;
        this.getNotes();
      });
    }
  }

  // 🔹 CLOSE MODAL
  closeModal() {
    this.showModal = false;
  }
}
