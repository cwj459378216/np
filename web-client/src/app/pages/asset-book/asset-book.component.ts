import { Component, ViewChild } from '@angular/core';
import { toggleAnimation } from 'src/app/shared/animations';
import Swal from 'sweetalert2';
import { NgxCustomModalComponent } from 'ngx-custom-modal';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface Asset {
    id: number;
    asset_name: string;
    ip_address: string;
    mac_address: string;
    type: string;
    status: string;
    last_updated: string;
}

@Component({
    selector: 'app-asset-book',
    animations: [toggleAnimation],
    templateUrl: './asset-book.component.html',
    styles: [`
        ::ng-deep .ng-select .ng-select-container {
            z-index: 1060 !important;
        }
        ::ng-deep .ng-dropdown-panel {
            z-index: 1070 !important;
        }
        ::ng-deep .modal-content {
            overflow: visible !important;
        }
        ::ng-deep .modal-body {
            overflow: visible !important;
        }
        ::ng-deep .custom-modal {
            overflow: visible !important;
        }
    `]
})
export class AssetBookComponent {
    constructor(
        public fb: FormBuilder,
        private http: HttpClient
    ) {}

    displayType = 'list';
    optionsType = ['Server', 'Workstation', 'Network Device', 'Security Device'];

    @ViewChild('addContactModal') addContactModal!: NgxCustomModalComponent;
    params!: FormGroup;
    filterdContactsList: Asset[] = [];
    searchUser = '';

    assetList: Asset[] = [];

    mask11 = [/\d/, /\d/, /\d/, '.', /\d/, /\d/, /\d/, '.', /\d/, /\d/, /\d/, '.', /\d/, /\d/, /\d/];
    maskMAC = [/[A-Fa-f0-9]/, /[A-Fa-f0-9]/, ':', /[A-Fa-f0-9]/, /[A-Fa-f0-9]/, ':', /[A-Fa-f0-9]/, /[A-Fa-f0-9]/, ':', /[A-Fa-f0-9]/, /[A-Fa-f0-9]/, ':', /[A-Fa-f0-9]/, /[A-Fa-f0-9]/, ':', /[A-Fa-f0-9]/, /[A-Fa-f0-9]/];

    initForm() {
        this.params = this.fb.group({
            id: [0],
            asset_name: ['', Validators.required],
            ip_address: ['', Validators.required],
            mac_address: ['', Validators.required],
            type: ['', Validators.required],
            status: ['Active'],
            last_updated: [new Date().toISOString().slice(0, 19).replace('T', ' ')]
        });
    }

    ngOnInit() {
        this.loadAssets();
        this.initForm();
    }

    loadAssets() {
        this.http.get(`${environment.apiUrl}/assets`).subscribe(
            (data: any) => {
                this.assetList = data;
                console.log('Loaded assets:', this.assetList);
                this.searchAssets();
            },
            error => {
                console.error('Error loading assets:', error);
                this.showMessage('Error loading assets', 'error');
            }
        );
    }

    searchAssets() {
        this.filterdContactsList = this.assetList.filter((d) => {
            if (!d || !d.asset_name || !d.ip_address || !d.mac_address) {
                return false;
            }
            return d.asset_name.toLowerCase().includes(this.searchUser.toLowerCase()) ||
                d.ip_address.toLowerCase().includes(this.searchUser.toLowerCase()) ||
                d.mac_address.toLowerCase().includes(this.searchUser.toLowerCase());
        });
    }

    editUser(asset: any = null) {
        this.addContactModal.open();
        this.initForm();
        if (asset) {
            this.params.patchValue({
                id: asset.id || 0,
                asset_name: asset.asset_name || '',
                ip_address: asset.ip_address || '',
                mac_address: asset.mac_address || '',
                type: asset.type || '',
                status: asset.status || 'Active',
                last_updated: asset.last_updated || new Date().toISOString().slice(0, 19).replace('T', ' ')
            });
        }
    }

    saveUser() {
        if (!this.params.valid) {
            this.showMessage('Please fill all required fields.', 'error');
            return;
        }

        const asset = this.params.value;
        const url = `${environment.apiUrl}/assets${asset.id ? `/${asset.id}` : ''}`;
        const method = asset.id ? 'put' : 'post';

        this.http[method](url, asset).subscribe(
            (response: any) => {
                this.loadAssets();
                this.showMessage('Asset has been saved successfully.');
                this.addContactModal.close();
            },
            error => {
                this.showMessage('Error saving asset', 'error');
            }
        );
    }

    deleteUser(asset: any) {
        Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete it!',
            padding: '2em'
        }).then((result) => {
            if (result.value) {
                this.http.delete(`${environment.apiUrl}/assets/${asset.id}`).subscribe(
                    () => {
                        this.loadAssets();
                        this.showMessage('Asset has been deleted successfully.');
                    },
                    error => {
                        this.showMessage('Error deleting asset', 'error');
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
}
