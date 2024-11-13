import { Component, ViewChild, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgxCustomModalComponent } from 'ngx-custom-modal';
import { slideDownUp, toggleAnimation } from 'src/app/shared/animations';
import Swal from 'sweetalert2';
import { IconModule } from "../../shared/icon/icon.module";

@Component({
  selector: 'app-role-management',
    animations: [toggleAnimation, slideDownUp],
  templateUrl: './role-management.component.html',
  styleUrl: './role-management.component.css'
})
export class RoleManagementComponent implements OnInit{
  constructor(public fb: FormBuilder) {}
  displayType = 'list';
  @ViewChild('addContactModal') addContactModal!: NgxCustomModalComponent;
  params!: FormGroup;
  filterdContactsList: any = [];
  searchUser = '';
  contactList = [
      {
          id: 1,
          path: 'profile-35.png',
          name: 'Alan Green',
          role: 'Web Developer',
          email: 'alan@mail.com',
          location: 'Boston, USA',
          phone: '+1 202 555 0197',
          posts: 25,
          followers: '5K',
          following: 500,
      }
  ];
  treeview1: any = ['images','html'];

  initForm() {
      this.params = this.fb.group({
          id: [0],
          name: ['', Validators.required],
          email: ['', Validators.compose([Validators.required, Validators.email])],
          role: ['', Validators.required],
          phone: ['', Validators.required],
          location: [''],
      });
  }

  ngOnInit() {
      this.searchContacts();
  }

  searchContacts() {
      this.filterdContactsList = this.contactList.filter((d) => d.name.toLowerCase().includes(this.searchUser.toLowerCase()));
  }

  editUser(user: any = null) {
      this.addContactModal.open();
      this.initForm();
      if (user) {
          this.params.setValue({
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              phone: user.phone,
              location: user.location,
          });
      }
  }

  saveUser() {
      if (this.params.controls['name'].errors) {
          this.showMessage('Name is required.', 'error');
          return;
      }
      if (this.params.controls['email'].errors) {
          this.showMessage('Email is required.', 'error');
          return;
      }
      if (this.params.controls['phone'].errors) {
          this.showMessage('Phone is required.', 'error');
          return;
      }
      if (this.params.controls['role'].errors) {
          this.showMessage('Occupation is required.', 'error');
          return;
      }

      if (this.params.value.id) {
          //update user
          let user: any = this.contactList.find((d) => d.id === this.params.value.id);
          user.name = this.params.value.name;
          user.email = this.params.value.email;
          user.role = this.params.value.role;
          user.phone = this.params.value.phone;
          user.location = this.params.value.location;
      } else {
          //add user
          let maxUserId = this.contactList.length
              ? this.contactList.reduce((max, character) => (character.id > max ? character.id : max), this.contactList[0].id)
              : 0;

          let user = {
              id: maxUserId + 1,
              path: 'profile-35.png',
              name: this.params.value.name,
              email: this.params.value.email,
              role: this.params.value.role,
              phone: this.params.value.phone,
              location: this.params.value.location,
              posts: 20,
              followers: '5K',
              following: 500,
          };
          this.contactList.splice(0, 0, user);
          this.searchContacts();
      }

      this.showMessage('User has been saved successfully.');
      this.addContactModal.close();
  }

  deleteUser(user: any = null) {
      this.contactList = this.contactList.filter((d) => d.id != user.id);
      this.searchContacts();
      this.showMessage('User has been deleted successfully.');
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
  toggleTreeview1(name: string) {
    if (this.treeview1.includes(name)) {
        this.treeview1 = this.treeview1.filter((d: string) => d !== name);
    } else {
        this.treeview1.push(name);
    }
}
}
