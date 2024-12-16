import { Component, ViewChild, OnInit } from '@angular/core';
import Swal from 'sweetalert2';
import { toggleAnimation } from 'src/app/shared/animations';
import { NgxCustomModalComponent } from 'ngx-custom-modal';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProtocolSettingsService, ProtocolSetting } from '../../services/protocol-settings.service';

interface Note {
  id: number;
  user: string;
  thumb: string;
  title: string;
  description: string;
  date: string;
  isFav: boolean;
  tag: string;
}

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css',
  animations: [toggleAnimation],

})
export class SettingsComponent implements OnInit {
  constructor(
    public fb: FormBuilder,
    private protocolSettingsService: ProtocolSettingsService
  ) {}
  defaultParams = {
      id: null,
      title: '',
      description: '',
      tag: '',
      user: '',
      thumb: '',
  };
  @ViewChild('isAddNoteModal') isAddNoteModal!: NgxCustomModalComponent;
  @ViewChild('isViewNoteModal') isViewNoteModal!: NgxCustomModalComponent;
  @ViewChild('isDeleteNoteModal') isDeleteNoteModal!: NgxCustomModalComponent;
  params!: FormGroup;
  isShowNoteMenu = false;
  notesList: Note[] = [
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
    this.loadProtocolSettings();
  }

  loadProtocolSettings() {
    this.protocolSettingsService.getAllSettings().subscribe({
      next: (settings) => {
        this.notesList = settings.map(setting => ({
          id: setting.id || 0,
          user: setting.protocolName,
          thumb: '',
          title: setting.port.toString(),
          description: setting.description,
          date: new Date().toLocaleDateString(),
          isFav: setting.isEnabled,
          tag: this.getTagFromImportanceLevel(setting.importanceLevel)
        }));
        this.searchNotes();
      },
      error: (error) => {
        this.showMessage('Failed to load protocol settings', 'error');
      }
    });
  }

  getTagFromImportanceLevel(level: string): string {
    switch (level) {
      case 'important': return 'important';
      case 'normal': return 'personal';
      case 'negligible': return 'work';
      default: return '';
    }
  }

  getImportanceLevelFromTag(tag: string): string {
    switch (tag) {
      case 'important': return 'important';
      case 'personal': return 'normal';
      case 'work': return 'negligible';
      default: return 'normal';
    }
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
    if (this.selectedTab === 'enabled') {
        this.filterdNotesList = this.notesList.filter((d: { isFav: boolean }) => d.isFav);
    } else if (this.selectedTab === 'disabled') {
        this.filterdNotesList = this.notesList.filter((d: { isFav: boolean }) => !d.isFav);
    } else if (this.selectedTab !== 'all') {
        this.filterdNotesList = this.notesList.filter((d: { tag: any }) => d.tag === this.selectedTab);
    } else {
        this.filterdNotesList = this.notesList;
    }
  }

  saveNote() {
    if (this.params.controls['title'].errors) {
      this.showMessage('Title is required.', 'error');
      return;
    }

    const setting: ProtocolSetting = {
      protocolName: this.params.value.user,
      port: parseInt(this.params.value.title),
      description: this.params.value.description,
      isEnabled: false,
      importanceLevel: this.getImportanceLevelFromTag(this.params.value.tag)
    };

    if (this.params.value.id) {
      this.protocolSettingsService.updateSetting(this.params.value.id, setting).subscribe({
        next: () => {
          this.showMessage('Protocol setting updated successfully.');
          this.loadProtocolSettings();
          this.isAddNoteModal.close();
        },
        error: () => {
          this.showMessage('Failed to update protocol setting', 'error');
        }
      });
    } else {
      this.protocolSettingsService.createSetting(setting).subscribe({
        next: () => {
          this.showMessage('Protocol setting created successfully.');
          this.loadProtocolSettings();
          this.isAddNoteModal.close();
        },
        error: () => {
          this.showMessage('Failed to create protocol setting', 'error');
        }
      });
    }
  }

  tabChanged(type: string) {
      this.selectedTab = type;
      this.searchNotes();
      this.isShowNoteMenu = false;
  }

  toggleEnabled(note: any) {
    const setting: ProtocolSetting = {
        protocolName: note.user,
        port: parseInt(note.title),
        description: note.description,
        isEnabled: !note.isFav,
        importanceLevel: this.getImportanceLevelFromTag(note.tag)
    };

    this.protocolSettingsService.updateSetting(note.id, setting).subscribe({
        next: () => {
            let item = this.filterdNotesList.find((d: { id: any }) => d.id === note.id);
            if (item) {
                item.isFav = !item.isFav;
                this.showMessage(`Protocol has been ${item.isFav ? 'enabled' : 'disabled'} successfully.`);
            }
            this.searchNotes();
        },
        error: () => {
            this.showMessage('Failed to update protocol status', 'error');
        }
    });
  }

  setTag(note: any, name: string = '') {
    const setting: ProtocolSetting = {
        protocolName: note.user,
        port: parseInt(note.title),
        description: note.description,
        isEnabled: note.isFav,
        importanceLevel: this.getImportanceLevelFromTag(name)
    };

    this.protocolSettingsService.updateSetting(note.id, setting).subscribe({
        next: () => {
            let item = this.filterdNotesList.find((d: { id: any }) => d.id === note.id);
            if (item) {
                item.tag = name;
                this.showMessage(`Protocol importance level has been changed to ${name} successfully.`);
            }
            this.searchNotes();
        },
        error: () => {
            this.showMessage('Failed to update protocol importance level', 'error');
        }
    });
  }

  deleteNoteConfirm(note: any) {
    setTimeout(() => {
        this.deletedNote = note;
        this.isDeleteNoteModal.open();
    });
  }

  deleteNote() {
    this.protocolSettingsService.deleteSetting(this.deletedNote.id).subscribe({
        next: () => {
            this.notesList = this.notesList.filter((d: { id: any }) => d.id != this.deletedNote.id);
            this.searchNotes();
            this.showMessage('Protocol has been deleted successfully.');
            this.isDeleteNoteModal.close();
        },
        error: () => {
            this.showMessage('Failed to delete protocol', 'error');
            this.isDeleteNoteModal.close();
        }
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
