import { Component, ViewChild } from '@angular/core';
import { toggleAnimation } from 'src/app/shared/animations';
import Swal from 'sweetalert2';
import { NgxCustomModalComponent } from 'ngx-custom-modal';
import { FormBuilder, FormGroup, Validators, ValidatorFn, AbstractControl } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { TranslateService } from '@ngx-translate/core';

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
        private http: HttpClient,
        private translate: TranslateService
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
        // IPv4 正则：每段 0-255，共 4 段
        const ipv4Regex = /^(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
        // MAC 正则：六段，两位十六进制（冒号分隔）
        const macRegex = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;

        this.params = this.fb.group({
            id: [0],
            asset_name: ['', Validators.required],
            ip_address: ['', [Validators.pattern(ipv4Regex)]],
            mac_address: ['', [Validators.pattern(macRegex)]],
            type: ['', Validators.required],
            status: ['Active'],
            last_updated: [new Date().toISOString().slice(0, 19).replace('T', ' ')]
        }, { validators: this.atLeastOne(['ip_address', 'mac_address']) });
    }

    // 至少填写一个：IP 或 MAC
    private atLeastOne(keys: string[]): ValidatorFn {
        return (group: AbstractControl) => {
            if (!group) return null;
            const anyFilled = keys.some(k => {
                const v = (group.get(k)?.value ?? '').toString().trim();
                return v.length > 0;
            });
            return anyFilled ? null : { atLeastOne: true };
        };
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
                this.showMessage(this.translate.instant('assetBook.errorLoadingAssets'), 'error');
            }
        );
    }

    searchAssets() {
        const keyword = (this.searchUser || '').trim().toLowerCase();
        if (!keyword) {
            this.filterdContactsList = [...this.assetList];
            return;
        }
        this.filterdContactsList = this.assetList.filter((d) => {
            if (!d) return false;
            const fields = [d.asset_name, d.ip_address, d.mac_address, d.type, d.status].map(v => (v || '').toString().toLowerCase());
            return fields.some(v => v.includes(keyword));
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
            this.showMessage(this.translate.instant('assetBook.pleaseAllRequiredFields'), 'error');
            return;
        }

        const asset = this.params.value;
        const url = `${environment.apiUrl}/assets${asset.id ? `/${asset.id}` : ''}`;
        const method = asset.id ? 'put' : 'post';

        this.http[method](url, asset).subscribe(
            (response: any) => {
                this.loadAssets();
                this.showMessage(this.translate.instant('assetBook.assetSavedSuccessfully'));
                this.addContactModal.close();
            },
            error => {
                this.showMessage(this.translate.instant('assetBook.errorSavingAsset'), 'error');
            }
        );
    }

    deleteUser(asset: any) {
        Swal.fire({
            title: this.translate.instant('assetBook.areYouSure'),
            text: this.translate.instant('assetBook.deleteConfirmText'),
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: this.translate.instant('assetBook.yesDeleteIt'),
            cancelButtonText: this.translate.instant('general.cancel'),
            padding: '2em'
        }).then((result) => {
            if (result.value) {
                this.http.delete(`${environment.apiUrl}/assets/${asset.id}`).subscribe(
                    () => {
                        this.loadAssets();
                        this.showMessage(this.translate.instant('assetBook.assetDeletedSuccessfully'));
                    },
                    error => {
                        this.showMessage(this.translate.instant('assetBook.errorDeletingAsset'), 'error');
                    }
                );
            }
        });
    }

    toggleAssetStatus(asset: Asset, event: Event) {
        const input = event.target as HTMLInputElement;
        const nextStatus = input.checked ? 'Active' : 'Inactive';
        const prevStatus = asset.status;
        asset.status = nextStatus; // optimistic
        const url = `${environment.apiUrl}/assets/${asset.id}`;
        this.http.put(url, { ...asset, status: nextStatus }).subscribe({
            next: () => {
                this.showMessage(nextStatus === 'Active' ?
                    this.translate.instant('assetBook.assetEnabledSuccessfully') :
                    this.translate.instant('assetBook.assetDisabledSuccessfully'));
            },
            error: () => {
                asset.status = prevStatus; // rollback
                this.showMessage(this.translate.instant('assetBook.errorUpdatingAssetStatus'), 'error');
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
