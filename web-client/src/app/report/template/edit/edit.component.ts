import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
    selector: 'app-edit',
    templateUrl: './edit.component.html'
})
export class EditComponent implements OnInit {
    constructor(private route: ActivatedRoute) {}
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
        // 获取路由参数中的id
        this.route.queryParams.subscribe(params => {
            const id = params['id'];
            // 这里应该根据id获取模板数据
            // 模拟数据
            this.params = {
                title: 'Template ' + id,
                templateNo: 'T00' + id,
                to: {
                    name: 'Client ' + id,
                    email: 'client' + id + '&#64;example.com',
                    address: '123 Street, City',
                    phone: '+1 234 567 890',
                },
                createDate: '2024-01-15',
                dueDate: '2024-02-15',
                bankInfo: {
                    no: '1234567890',
                    name: 'Bank Name',
                    swiftCode: 'SWIFTCODE',
                    country: 'United States',
                    ibanNo: 'IBAN12345',
                },
                notes: 'Sample notes for template ' + id,
            };

            this.items = [
                {
                    id: 1,
                    title: 'Item 1',
                    description: 'Description for item 1',
                    rate: 100,
                    quantity: 2,
                    amount: 200,
                }
            ];

            this.tax = 10;
            this.discount = 5;
            this.shippingCharge = 15;
            this.paymentMethod = 'bank';
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