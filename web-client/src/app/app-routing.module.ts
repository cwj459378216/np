import { EventComponent } from './alarm/event/event.component';
import { AlarmSettingsComponent } from './alarm/alarm-settings/alarm-settings.component';

const routes: Routes = [
  // ... other routes
  {
    path: 'alarm',
    children: [
      {
        path: 'event',
        component: EventComponent
      },
      {
        path: 'settings',
        component: AlarmSettingsComponent
      }
    ]
  }
]; 