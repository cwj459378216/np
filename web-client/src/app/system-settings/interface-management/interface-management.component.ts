import { Component, ViewChild } from '@angular/core';
import { toggleAnimation } from 'src/app/shared/animations';
import Swal from 'sweetalert2';
import { NgxCustomModalComponent } from 'ngx-custom-modal';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface NetworkInterface {
    id: number;
    interface_name: string;
    method: string;
    ip_address: string | null;
    netmask: string | null;
    gateway: string | null;
    created_at: string;
}

@Component({
  selector: 'app-interface-management',
  animations: [toggleAnimation],
  templateUrl: './interface-management.component.html',
  styleUrl: './interface-management.component.css'
})
export class InterfaceManagementComponent {
  constructor(
    public fb: FormBuilder,
    private http: HttpClient
  ) {}

  displayType = 'list';
  optionsMethod = ['Static', 'DHCP'];
  showDHCP = false;

  interfaces: NetworkInterface[] = [];
  filteredInterfaces: NetworkInterface[] = [];
  searchText = '';

  @ViewChild('addContactModal') addContactModal!: NgxCustomModalComponent;
  params!: FormGroup;

  ngOnInit() {
    this.loadInterfaces();
    this.initForm();
  }

  loadInterfaces() {
    this.http.get(`${environment.apiUrl}/api/interfaces`).subscribe(
      (data: any) => {
        this.interfaces = data;
        this.searchInterfaces();
      },
      error => {
        this.showMessage('Error loading interfaces', 'error');
      }
    );
  }

  initForm() {
    this.params = this.fb.group({
      id: [0],
      interface_name: ['', Validators.required],
      method: ['Static', Validators.required],
      ip_address: ['', [Validators.pattern('^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$')]],
      netmask: ['', [Validators.pattern('^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$')]],
      gateway: ['', [Validators.pattern('^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$')]]
    });
  }

  searchInterfaces() {
    if (!this.searchText.trim()) {
      this.filteredInterfaces = this.interfaces;
    } else {
      const search = this.searchText.toLowerCase();
      this.filteredInterfaces = this.interfaces.filter(iface => 
        iface.interface_name.toLowerCase().includes(search) ||
        (iface.ip_address && iface.ip_address.toLowerCase().includes(search))
      );
    }
  }

  formatIpAddress(ip: string | null): string {
    if (!ip) return '';
    return ip.split('.')
      .map(part => {
        const num = parseInt(part, 10);
        return !isNaN(num) && num >= 0 && num <= 255 ? num.toString() : '';
      })
      .filter(part => part !== '')
      .join('.');
  }

  editInterface(iface: NetworkInterface) {
    this.addContactModal.open();
    this.initForm();

    const formValue = {
      id: iface.id,
      interface_name: iface.interface_name || '',
      method: iface.method || 'Static',
      ip_address: this.formatIpAddress(iface.ip_address),
      netmask: this.formatIpAddress(iface.netmask),
      gateway: this.formatIpAddress(iface.gateway)
    };

    requestAnimationFrame(() => {
      this.params.patchValue(formValue);
      this.showDHCP = iface.method === 'DHCP';
    });
  }

  saveInterface() {
    if (!this.params.valid) {
        this.showMessage('Please fill all required fields.', 'error');
        return;
    }

    const iface = this.params.value;
    console.log('Saving interface:', iface);

    if (iface.method === 'DHCP') {
        iface.ip_address = null;
        iface.netmask = null;
        iface.gateway = null;
    } else {
        if (!this.isValidIpFormat(iface.ip_address) || 
            !this.isValidIpFormat(iface.netmask) || 
            !this.isValidIpFormat(iface.gateway)) {
            this.showMessage('Please enter valid IP addresses', 'error');
            return;
        }
    }

    const url = `${environment.apiUrl}/api/interfaces${iface.id ? `/${iface.id}` : ''}`;
    const method = iface.id ? 'put' : 'post';

    this.http[method](url, iface).subscribe(
        (response: any) => {
            this.loadInterfaces();
            this.showMessage('Interface has been saved successfully.');
            this.addContactModal.close();
        },
        error => {
            console.error('Error saving interface:', error);
            this.showMessage('Error saving interface', 'error');
        }
    );
  }

  isValidIpFormat(ip: string): boolean {
    if (!ip) return false;
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    
    return parts.every(part => {
      const num = parseInt(part, 10);
      return !isNaN(num) && num >= 0 && num <= 255 && 
             (part === '0' || !part.startsWith('0'));
    });
  }

  deleteInterface(iface: NetworkInterface) {
    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      padding: '2em'
    }).then((result) => {
      if (result.value) {
        this.http.delete(`${environment.apiUrl}/api/interfaces/${iface.id}`).subscribe(
          () => {
            this.loadInterfaces();
            this.showMessage('Interface has been deleted successfully.');
          },
          error => {
            this.showMessage('Error deleting interface', 'error');
          }
        );
      }
    });
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
  
  onAdapterChange(event: any) {
    console.log(event);
    if (event === 'DHCP') {
      this.showDHCP = true;
    } else {
      this.showDHCP = false;
    }
  }
}
