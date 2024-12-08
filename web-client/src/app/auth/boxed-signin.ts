import { Component } from '@angular/core';
import { toggleAnimation } from 'src/app/shared/animations';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { AppService } from 'src/app/service/app.service';

@Component({
    selector: 'app-boxed-signin',
    templateUrl: './boxed-signin.html',
    animations: [toggleAnimation],
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

    submit() {
        if (this.inputEmail === "admin" && this.inputPassword === "admin123") {
            // 登录成功后
            localStorage.setItem('auth_token', 'your_token_here');
            this.router.navigate(['/dashboard']);
        } else {
            alert("Invalid Credentials");
        }
    }
}
