import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { AppService } from 'src/app/service/app.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import Swal from 'sweetalert2';
import { IconModule } from 'src/app/shared/icon/icon.module';

@Component({
    selector: 'app-boxed-signin',
    templateUrl: './boxed-signin.html',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        IconModule,
        TranslateModule
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class BoxedSigninComponent {
    store: any;
    inputEmail: any;
    inputPassword: any;

    constructor(
        public translate: TranslateService,
        public storeData: Store<any>,
        public router: Router,
        private appSetting: AppService,
        private http: HttpClient
    ) {
        this.initStore();
    }

    async initStore() {
        this.storeData
            .select((d) => d.index)
            .subscribe((d) => {
                this.store = d;
            });
    }

    changeLanguage(item: any) {
        this.translate.use(item.code);
        this.appSetting.toggleLanguage(item);
        if (this.store.locale?.toLowerCase() === 'ae') {
            this.storeData.dispatch({ type: 'toggleRTL', payload: 'rtl' });
        } else {
            this.storeData.dispatch({ type: 'toggleRTL', payload: 'ltr' });
        }
        window.location.reload();
    }

    async submit() {
        try {
            const response = await this.http.post<{token: string; user: any}>(`${environment.apiUrl}/users/login`, {
                username: this.inputEmail,
                password: this.inputPassword
            }).toPromise();

            if (response) {
                localStorage.setItem('auth_token', response.token);
                localStorage.setItem('user_info', JSON.stringify(response.user));
                this.router.navigate(['/dashboard']);
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: '登录失败',
                text: '用户名或密码错误',
                confirmButtonText: '确定'
            });
        }
    }
}
