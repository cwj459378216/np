import { Component, ViewChild } from '@angular/core';
import Swal from 'sweetalert2';
import { toggleAnimation } from 'src/app/shared/animations';
import { NgxCustomModalComponent } from 'ngx-custom-modal';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css',
  animations: [toggleAnimation],

})
export class SettingsComponent {
  constructor(public fb: FormBuilder) {}
  defaultParams = {
      id: null,
      title: '',
      description: '',
      tag: '',
      user: '',
      thumb: '',
  };
  @ViewChild('isAddNoteModal') isAddNoteModal!: NgxCustomModalComponent;
  @ViewChild('isDeleteNoteModal') isDeleteNoteModal!: NgxCustomModalComponent;
  @ViewChild('isViewNoteModal') isViewNoteModal!: NgxCustomModalComponent;
  params!: FormGroup;
  isShowNoteMenu = false;
  notesList = [
    {
      id: 7,
      user: 'HTTP',
      thumb: '',
      title: '80',
      description: 'HTTP stands for Hypertext Transfer Protocol, used for transferring web pages and data on the internet.',
      date: '11/10/2020',
      isFav: false,
      tag: '',
  },
  {
    id: 7,
    user: 'DNS',
    thumb: '',
    title: '53',
    description: 'DNS stands for Domain Name System, translating domain names into IP addresses so that computers can locate each other.',
    date: '11/10/2020',
    isFav: true,
    tag: 'personal',
},
{
  id: 7,
  user: 'SSL',
  thumb: '',
  title: '443',
  description: 'SSL (Secure Sockets Layer) is used for securing HTTP traffic, commonly referred to as HTTPS. It encrypts data to ensure security.',
  date: '11/10/2020',
  isFav: false,
  tag: 'work',
},
{
  id: 7,
  user: 'SMB',
  thumb: '',
  title: '445',
  description: 'SMB stands for Server Message Block, used for file sharing, printer sharing, and other network services between computers.',
  date: '11/10/2020',
  isFav: false,
  tag: 'social',
},{
  id: 7,
  user: 'FTP',
  thumb: '',
  title: '21',
  description: 'FTP stands for File Transfer Protocol, a standard network protocol for transferring files between a client and a server.',
  date: '11/10/2020',
  isFav: false,
  tag: 'important',
}
  ];
  filterdNotesList: any = '';
  selectedTab: any = 'all';
  deletedNote: any = null;
  selectedNote: any = {
      id: null,
      title: '',
      description: '',
      tag: '',
      user: '',
      thumb: '',
  };

  ngOnInit() {
      this.searchNotes();
  }

  initForm() {
      this.params = this.fb.group({
          id: [0],
          title: ['', Validators.required],
          description: [''],
          tag: [''],
          user: [''],
          thumb: [''],
      });
  }

  searchNotes() {
      if (this.selectedTab != 'fav') {
          if (this.selectedTab != 'all' || this.selectedTab === 'delete') {
              this.filterdNotesList = this.notesList.filter((d: { tag: any }) => d.tag === this.selectedTab);
          } else {
              this.filterdNotesList = this.notesList;
          }
      } else {
          this.filterdNotesList = this.notesList.filter((d: { isFav: any }) => d.isFav);
      }
  }

  saveNote() {
      if (this.params.controls['title'].errors) {
          this.showMessage('Title is required.', 'error');
          return;
      }
      if (this.params.value.id) {
          //update task
          let note: any = this.notesList.find((d: { id: any }) => d.id === this.params.value.id);
          note.title = this.params.value.title;
          note.user = this.params.value.user;
          note.description = this.params.value.description;
          note.tag = this.params.value.tag;
      } else {
          //add note
          let maxNoteId = this.notesList.length
              ? this.notesList.reduce((max: number, character: { id: number }) => (character.id > max ? character.id : max), this.notesList[0].id)
              : 0;
          let dt = new Date();
          let note = {
              id: maxNoteId + 1,
              title: this.params.value.title,
              user: this.params.value.user,
              thumb: 'profile-21.jpeg',
              description: this.params.value.description,
              date: dt.getDate() + '/' + Number(dt.getMonth()) + 1 + '/' + dt.getFullYear(),
              isFav: false,
              tag: this.params.value.tag,
          };
          this.notesList.splice(0, 0, note);
          this.searchNotes();
      }

      this.showMessage('Note has been saved successfully.');
      this.isAddNoteModal.close();
      this.searchNotes();
  }

  tabChanged(type: string) {
      this.selectedTab = type;
      this.searchNotes();
      this.isShowNoteMenu = false;
  }

  setFav(note: any) {
      let item = this.filterdNotesList.find((d: { id: any }) => d.id === note.id);
      item.isFav = !item.isFav;
      this.searchNotes();
  }

  setTag(note: any, name: string = '') {
      let item = this.filterdNotesList.find((d: { id: any }) => d.id === note.id);
      item.tag = name;
      this.searchNotes();
  }

  deleteNoteConfirm(note: any) {
      setTimeout(() => {
          this.deletedNote = note;
          this.isDeleteNoteModal.open();
      });
  }

  viewNote(note: any) {
      setTimeout(() => {
          this.selectedNote = note;
          this.isViewNoteModal.open();
      });
  }

  editNote(note: any = null) {
      this.isShowNoteMenu = false;
      this.isAddNoteModal.open();
      this.initForm();
      if (note) {
          this.params.setValue({
              id: note.id,
              title: note.title,
              description: note.description,
              tag: note.tag,
              user: note.user,
              thumb: note.thumb,
          });
      }
  }

  deleteNote() {
      this.notesList = this.notesList.filter((d: { id: any }) => d.id != this.deletedNote.id);
      this.searchNotes();
      this.showMessage('Note has been deleted successfully.');
      this.isDeleteNoteModal.close();
  }

  showMessage(msg = '', type = 'success') {
      const toast: any = Swal.mixin({
          toast: true,
          position: 'top',
          showConfirmButton: false,
          timer: 3000,
          customClass: { container: 'toast' },
      });
      toast.fire({
          icon: type,
          title: msg,
          padding: '10px 20px',
      });
  }
}
