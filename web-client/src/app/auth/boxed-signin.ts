import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { AppService } from 'src/app/service/app.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AuthService } from 'src/app/services/auth/auth.service';
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

    private returnUrl: string = '/dashboard';

    constructor(
        public translate: TranslateService,
        public storeData: Store<any>,
        public router: Router,
        private route: ActivatedRoute,
        private appSetting: AppService,
    private http: HttpClient,
    private auth: AuthService
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
        if (!this.inputEmail || !this.inputPassword) {
            Swal.fire({
                icon: 'warning',
                title: this.translate.instant('auth.prompt'),
                text: this.translate.instant('auth.enterUsernamePassword'),
                confirmButtonText: this.translate.instant('general.ok')
            });
            return;
        }
        // 解析路由中的 returnUrl（如果用户因守卫被重定向）
        if (!this.returnUrl) {
            const q = this.route.snapshot.queryParamMap.get('returnUrl');
            if (q) this.returnUrl = q;
        }
        this.auth.login(this.inputEmail, this.inputPassword).subscribe({
            next: () => {
                // 登录成功跳转目标：returnUrl 或 dashboard
                this.router.navigate([this.returnUrl || '/dashboard']);
            },
            error: () => {
                Swal.fire({
                    icon: 'error',
                    title: this.translate.instant('auth.loginFailed'),
                    text: this.translate.instant('auth.invalidCredentials'),
                    confirmButtonText: this.translate.instant('general.ok')
                });
            }
        });
    }
}
