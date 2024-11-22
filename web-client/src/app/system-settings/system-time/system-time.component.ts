import { Component } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Store } from '@ngrx/store';
import { FlatpickrDefaultsInterface } from 'angularx-flatpickr';

@Component({
  selector: 'app-system-time',
  templateUrl: './system-time.component.html',
  styleUrl: './system-time.component.css'
})
export class SystemTimeComponent {
  timeSettingMethod: string = 'manual'; // 默认选 Manual Time
  optionsTimeZone = ['UTC', 'GMT', 'GMT+1', 'GMT+2', 'GMT+3', 'GMT+4', 'GMT+5', 'GMT+6', 'GMT+7', 'GMT+8', 'GMT+9', 'GMT+10', 'GMT+11', 'GMT+12']
  optionsFrequency = ['1 Minute', '5 Minutes', '10 Minutes', '15 Minutes', '30 Minutes', '1 Hour', '2 Hours', '4 Hours', '6 Hours', '8 Hours', '12 Hours', '1 Day']
  dateTime: FlatpickrDefaultsInterface;
  input5: any;
  input4: any;

  form2!: FormGroup;

  constructor(public storeData: Store<any>, public fb: FormBuilder) {
    this.initStore();
    this.form2 = this.fb.group({
      date2: ['2022-07-05 12:00'],
    });
    this.dateTime = {
      enableTime: true,
      dateFormat: 'Y-m-d H:i',
      // position: this.store.rtlClass === 'rtl' ? 'auto right' : 'auto left',
      monthSelectorType: 'dropdown',
    };
  }
  store: any;

  async initStore() {
    this.storeData
      .select((d) => d.index)
      .subscribe((d) => {
        this.store = d;
      });
  }

  onAdapterChange(event: any) {
    this.timeSettingMethod = event.target.value;
    console.log(event.target.value);
  }

}
