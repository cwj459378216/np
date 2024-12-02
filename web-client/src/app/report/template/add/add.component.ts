import { Component, OnInit } from '@angular/core';

@Component({
    selector: 'app-add',
    templateUrl: './add.component.html'
})
export class AddComponent implements OnInit {
    constructor() {}
    items: any = [];
    selectedFile = null;
    params = {
        title: '',
        templateNo: '',
        to: {
            name: '',
            email: '',
            address: '',
            phone: '',
        },
        createDate: '',
        dueDate: '',
        bankInfo: {
            no: '',
            name: '',
            swiftCode: '',
            country: '',
            ibanNo: '',
        },
        notes: '',
    };
    currencyList = [
        'USD - US Dollar',
        'GBP - British Pound',
        'IDR - Indonesian Rupiah',
        'INR - Indian Rupee',
        'BRL - Brazilian Real',
        'EUR - Germany (Euro)',
        'TRY - Turkish Lira',
    ];
    selectedCurrency = 'USD - US Dollar';
    tax: number | undefined;
    discount: number | undefined;
    shippingCharge: number | undefined;
    paymentMethod = '';

    ngOnInit() {
        //set default data
        this.items.push({
            id: 1,
            title: '',
            description: '',
            rate: 0,
            quantity: 0,
            amount: 0,
        });
    }

    addItem() {
        let maxId = 0;
        if (this.items && this.items.length) {
            maxId = this.items.reduce((max: number, character: any) => (character.id > max ? character.id : max), this.items[0].id);
        }
        this.items.push({
            id: maxId + 1,
            title: '',
            description: '',
            rate: 0,
            quantity: 0,
            amount: 0,
        });
    }

    removeItem(item: any = null) {
        this.items = this.items.filter((d: any) => d.id != item.id);
    }
} 