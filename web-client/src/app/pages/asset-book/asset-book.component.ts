import { Component, ViewChild } from '@angular/core';
import { toggleAnimation } from 'src/app/shared/animations';
import Swal from 'sweetalert2';
import { NgxCustomModalComponent } from 'ngx-custom-modal';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

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
    constructor(public fb: FormBuilder) {}
    
    displayType = 'list';
    optionsType = ['Server', 'Workstation', 'Network Device', 'Security Device'];
    
    @ViewChild('addContactModal') addContactModal!: NgxCustomModalComponent;
    params!: FormGroup;
    filterdContactsList: any = [];
    searchUser = '';
    
    assetList = [
        {
            id: 1,
            asset_name: 'Server-01',
            ip_address: '192.168.1.100',
            mac_address: '00:1B:44:11:3A:B7',
            type: 'Server',
            status: 'Active',
            last_updated: '2024-03-21 10:30:45'
        },
        {
            id: 2,
            asset_name: 'Workstation-02',
            ip_address: '192.168.1.101',
            mac_address: '00:1B:44:11:3A:B8',
            type: 'Workstation',
            status: 'Active',
            last_updated: '2024-03-21 10:30:45'
        }
    ];

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
        this.searchAssets();
    }

    searchAssets() {
        this.filterdContactsList = this.assetList.filter((d) => 
            d.asset_name.toLowerCase().includes(this.searchUser.toLowerCase()) ||
            d.ip_address.toLowerCase().includes(this.searchUser.toLowerCase()) ||
            d.mac_address.toLowerCase().includes(this.searchUser.toLowerCase())
        );
    }

    editUser(asset: any = null) {
        this.addContactModal.open();
        this.initForm();
        if (asset) {
            this.params.setValue({
                id: asset.id,
                asset_name: asset.asset_name,
                ip_address: asset.ip_address,
                mac_address: asset.mac_address,
                type: asset.type,
                status: asset.status,
                last_updated: asset.last_updated
            });
        }
    }

    saveUser() {
        if (this.params.controls['asset_name'].errors) {
            this.showMessage('Asset name is required.', 'error');
            return;
        }
        if (this.params.controls['ip_address'].errors) {
            this.showMessage('IP address is required.', 'error');
            return;
        }
        if (this.params.controls['mac_address'].errors) {
            this.showMessage('MAC address is required.', 'error');
            return;
        }
        if (this.params.controls['type'].errors) {
            this.showMessage('Asset type is required.', 'error');
            return;
        }

        if (this.params.value.id) {
            // update asset
            let asset: any = this.assetList.find((d) => d.id === this.params.value.id);
            asset.asset_name = this.params.value.asset_name;
            asset.ip_address = this.params.value.ip_address;
            asset.mac_address = this.params.value.mac_address;
            asset.type = this.params.value.type;
            asset.status = this.params.value.status;
            asset.last_updated = new Date().toISOString().slice(0, 19).replace('T', ' ');
        } else {
            // add asset
            let maxId = this.assetList.length
                ? this.assetList.reduce((max, asset) => (asset.id > max ? asset.id : max), this.assetList[0].id)
                : 0;

            let asset = {
                id: maxId + 1,
                asset_name: this.params.value.asset_name,
                ip_address: this.params.value.ip_address,
                mac_address: this.params.value.mac_address,
                type: this.params.value.type,
                status: 'Active',
                last_updated: new Date().toISOString().slice(0, 19).replace('T', ' ')
            };
            this.assetList.splice(0, 0, asset);
            this.searchAssets();
        }

        this.showMessage('Asset has been saved successfully.');
        this.addContactModal.close();
    }

    deleteUser(asset: any = null) {
        this.assetList = this.assetList.filter((d) => d.id != asset.id);
        this.searchAssets();
        this.showMessage('Asset has been deleted successfully.');
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