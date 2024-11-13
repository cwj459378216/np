import { Component, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toggleAnimation } from 'src/app/shared/animations';
import { NgxCustomModalComponent } from 'ngx-custom-modal';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { Store } from '@ngrx/store';
import { FileUploadWithPreview } from 'file-upload-with-preview';
import { FlatpickrDefaultsInterface } from 'angularx-flatpickr';

@Component({
  selector: 'app-collector',
  templateUrl: './collector.component.html',
  styleUrl: './collector.component.css',
  animations: [toggleAnimation],
  // styleUrls: ['./collector.component.css', './css/core.css', './css/ipad.css', './css/sharkcss-3.15.0.css']
})
export class CollectorComponent implements OnInit {
  tab2: string = 'home';
  htmlContent: string = '';
  isLoading = true;
  store: any;
  revenueChart: any;
  showChannels = false;
  showUpload = false;
  showTimeRange = false;
  showAlarm = false;


  displayType = 'list';
  @ViewChild('addContactModal') addContactModal!: NgxCustomModalComponent;
  params!: FormGroup;
  filterdContactsList: any = [];
  searchUser = '';
  contactList = [
    {
      id: 1,
      name: 'Alan Green',
      role: 'Web Developer',
      email: 'alan@mail.com',
      location: 'Boston, USA',
      phone: '+1 202 555 0197',
      posts: 25,
      followers: '5K',
      following: 500,
      path: 'profile-35.png',
      "creationTime": "2024/01/01 12:00:00",
      "interfaceName": "admin",
      "storageStrategy": "B",
      "filterStrategy": "CC",
      "protocolAnalysisEnabled": true,
      "idsEnabled": false,
      "action": "",
    },

  ];
  options = ['DPDK', 'File', 'Adapter 1'];
  optionsFileSize = ['64M', '128M', '256M'];
  optionsTrigger = ['Timer', 'Alarm'];
  optionsAlarm = ['Alarm1', 'Alarm2']
  input5: string | undefined;
  input3: string | undefined;
  input4: string | undefined;
  rangeCalendar: FlatpickrDefaultsInterface;
  form3!: FormGroup;
  constructor(private http: HttpClient, public fb: FormBuilder, public storeData: Store<any>) {
    this.initStore();
    this.isLoading = false;
    this.form3 = this.fb.group({
      date3: ['2022-07-05 00:00:00 to 2022-07-10 23:59:59'], 
  });
    this.rangeCalendar = {
      dateFormat: 'Y-m-d H:i:S',
      enableTime: true,   
      enableSeconds: true, 
      time24hr: true, 
      mode: 'range',
      // position: this.store.rtlClass === 'rtl' ? 'auto right' : 'auto left',
      monthSelectorType: 'dropdown',
    };
  }
  ngOnInit() {

    this.http.get('assets/decode/index.html', { responseType: 'text' })
      .subscribe(data => {
        this.htmlContent = data;
      });

    this.searchContacts();

  }
  async initStore() {
    this.storeData
      .select((d) => d.index)
      .subscribe((d) => {
        const hasChangeTheme = this.store?.theme !== d?.theme;
        const hasChangeLayout = this.store?.layout !== d?.layout;
        const hasChangeMenu = this.store?.menu !== d?.menu;
        const hasChangeSidebar = this.store?.sidebar !== d?.sidebar;

        this.store = d;

        if (hasChangeTheme || hasChangeLayout || hasChangeMenu || hasChangeSidebar) {
          if (this.isLoading || hasChangeTheme) {
            this.initCharts(); //init charts
          } else {
            setTimeout(() => {
              this.initCharts(); // refresh charts
            }, 300);
          }
        }
      });
  }

  initCharts() {
    const isDark = this.store.theme === 'dark' || this.store.isDarkMode ? true : false;
    const isRtl = this.store.rtlClass === 'rtl' ? true : false;
    // revenue
    this.revenueChart = {
      chart: {
        height: 150,
        type: 'area',
        fontFamily: 'Nunito, sans-serif',
        zoom: {
          enabled: false,
        },
        toolbar: {
          show: false,
        },
      },
      dataLabels: {
        enabled: false,
      },
      stroke: {
        show: true,
        curve: 'smooth',
        width: 2,
        lineCap: 'square',
      },
      dropShadow: {
        enabled: true,
        opacity: 0.2,
        blur: 10,
        left: -7,
        top: 22,
      },
      colors: isDark ? ['#2196f3', '#e7515a'] : ['#1b55e2', '#e7515a'],
      markers: {
        show: false,
        size: 6,  // 设置标记的大小
        colors: ['#1b55e2', '#e7515a'],  // 设置标记的颜色，可以设置为不同的颜色数组
        strokeColor: '#fff',  // 设置标记的边框颜色
        strokeWidth: 2,  // 设置边框宽度
        shape: 'circle',  // 设置标记的形状为圆形
        hover: {
          size: 8,  // 鼠标悬停时标记的大小
          sizeOffset: 3,  // 鼠标悬停时标记的大小偏移
        },
      },
      // labels: ['Jan', 'Feb', 'M  ar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      xaxis: {
        type: 'datetime',
        axisBorder: {
          show: false,
        },
        axisTicks: {
          show: false,
        },
        crosshairs: {
          show: false,
        },
        labels: {
          show: false,
          offsetX: isRtl ? 2 : 0,
          offsetY: 3,
          style: {
            fontSize: '12px',
            cssClass: 'apexcharts-xaxis-title',
          },
          formatter: (value: number) => {
            // 使用固定格式化的日期
            const date = new Date(value);
            const formatter = new Intl.DateTimeFormat('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            });
            return formatter.format(date); // 返回固定格式
          },
        },
      },
      yaxis: {
        tickAmount: 2,
        labels: {
          formatter: (value: number) => {
            return parseInt(value * 100 + "") + '%';
          },
          offsetX: isRtl ? -30 : -10,
          offsetY: 0,
          style: {
            fontSize: '12px',
            cssClass: 'apexcharts-yaxis-title',
          },
        },
        opposite: isRtl ? true : false,
      },
      grid: {
        borderColor: isDark ? '#191e3a' : '#e0e6ed',
        strokeDashArray: 5,
        xaxis: {
          lines: {
            show: true,
          },
        },
        yaxis: {
          lines: {
            show: false,
          },
        },
        padding: {
          top: 0,
          right: 20,
          bottom: 20,
          left: 0,
        },
      },
      legend: {
        show: false,
        position: 'top',
        horizontalAlign: 'right',
        fontSize: '16px',
        markers: {
          width: 10,
          height: 10,
          offsetX: -2,
        },
        itemMargin: {
          horizontal: 10,
          vertical: 5,
        },
      },
      tooltip: {
        marker: {
          show: true,
        },
        x: {
          show: false,
        },
      },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          inverseColors: !1,
          opacityFrom: isDark ? 0.19 : 0.28,
          opacityTo: 0.05,
          stops: isDark ? [100, 100] : [45, 100],
        },
      },
      series: [
        {
          name: 'Channel 0 Utilization',
          data: [
            [1609459200000, 0.1], // 时间戳，收入
            [1612137600000, 0.2],
            [1614556800000, 0.5],
            [1617235200000, 0.8],
            [1619827200000, 0.3],
            [1622505600000, 0.6],
            [1625097600000, 0.5],
            [1627776000000, 0.9],
            [1630454400000, 0.7],
            [1633046400000, 0.4],
            [1635724800000, 0.8],
            [1638316800000, 0.6],
          ],
        },
        {
          name: 'Channel 1 Utilization',
          data: [
            [1609459200000, 0.2], // 时间戳，支出
            [1612137600000, 0.3],
            [1614556800000, 0.1],
            [1617235200000, 0.5],
            [1619827200000, 0.2],
            [1622505600000, 0.7],
            [1625097600000, 0.8],
            [1627776000000, 0.5],
            [1630454400000, 0.1],
            [1633046400000, 0.4],
            [1635724800000, 0.3],
            [1638316800000, 0.8],
          ],
        },
      ],
    };
  }

  initForm() {
    this.params = this.fb.group({
      id: [0],
      name: ['', Validators.required],
      "interfaceName": ['', Validators.required],
      "storageStrategy": ['', Validators.required],
      "filterStrategy": ['', Validators.required],
    });
  }


  searchContacts() {
    this.filterdContactsList = this.contactList.filter((d) => d.name.toLowerCase().includes(this.searchUser.toLowerCase()));
  }

  editUser(user: any = null) {
    this.addContactModal.open();
    this.initForm();
    if (user) {
      this.params.setValue({
        id: user.id,
        name: user.name,
        // email: user.email,
        // role: user.role,
        // phone: user.phone,
        // location: user.locati  on,
        "interfaceName": "admin",
        "storageStrategy": "B",
        "filterStrategy": "CC",
      });
    }
  }

  saveUser() {
    // if (this.params.controls['name'].errors) {
    //   this.showMessage('Name is required.', 'error');
    //   return;
    // }
    // if (this.params.controls['email'].errors) {
    //   this.showMessage('Email is required.', 'error');
    //   return;
    // }
    // if (this.params.controls['phone'].errors) {
    //   this.showMessage('Phone is required.', 'error');
    //   return;
    // }
    // if (this.params.controls['role'].errors) {
    //   this.showMessage('Occupation is required.', 'error');
    //   return;
    // }

    if (this.params.value.id) {
      //update user
      let user: any = this.contactList.find((d) => d.id === this.params.value.id);
      user.name = this.params.value.name;
      user.email = this.params.value.email;
      user.role = this.params.value.role;
      user.phone = this.params.value.phone;
      user.location = this.params.value.location;
    } else {
      //add user
      let maxUserId = this.contactList.length
        ? this.contactList.reduce((max, character) => (character.id > max ? character.id : max), this.contactList[0].id)
        : 0;

      let user = {
        id: maxUserId + 1,
        path: 'profile-35.png',
        name: this.params.value.name,
        email: this.params.value.email,
        role: this.params.value.role,
        phone: this.params.value.phone,
        location: this.params.value.location,
        posts: 20,
        followers: '5K',
        following: 500,
        "creationTime": "2024/01/01 12:00:00",
        "interfaceName": "admin",
        "storageStrategy": "B",
        "filterStrategy": "CC",
        "protocolAnalysisEnabled": true,
        "idsEnabled": false,
        "action": "",
      };
      this.contactList.splice(0, 0, user);
      this.searchContacts();
    }

    this.showMessage('User has been saved successfully.');
    this.addContactModal.close();
  }

  deleteUser(user: any = null) {
    this.contactList = this.contactList.filter((d) => d.id != user.id);
    this.searchContacts();
    this.showMessage('User has been deleted successfully.');
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

    // 根据选项来设置显示的内容
    if (event === 'File') {
      this.showChannels = false;
      this.showUpload = true;
      setTimeout(() => {
        new FileUploadWithPreview('myFirstImage', {
          images: {
            // baseImage: '/assets/images/file-preview.svg',
            // backgroundImage: '',
          },
        });
        let previewContainer = document.querySelector('.image-preview') as HTMLElement;
        if (previewContainer) {
          previewContainer.remove();
        }

      }, 100);
    } else {
      this.showChannels = true;
      this.showUpload = false;
    }
  }

  onTriggerChange(event: any) {
    if (event === 'Timer') {
      this.showTimeRange = true;
      this.showAlarm = false;
    } else {
      this.showTimeRange = false;
      this.showAlarm = true;
    }
  }
}
