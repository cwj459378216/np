import { Routes } from '@angular/router';
import { EventComponent } from './alarm/event/event.component';
import { AlarmSettingsComponent } from './alarm/alarm-settings/alarm-settings.component';
import { BasicConfigurationComponent } from './pages/threat-management/basic-configuration/basic-configuration.component';
import { RulesPolicyComponent } from './pages/threat-management/rules-policy/rules-policy.component';
import { RuleUpdateComponent } from './pages/threat-management/rule-update/rule-update.component';
import { LocalRulesComponent } from './pages/threat-management/local-rules/local-rules.component';
import { AssetBookComponent } from './pages/asset-book/asset-book.component';

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
  },
  {
    path: 'threat-management',
    children: [
      {
        path: 'basic-configuration',
        component: BasicConfigurationComponent
      },
      {
        path: 'rules-policy',
        component: RulesPolicyComponent
      },
      {
        path: 'rule-update',
        component: RuleUpdateComponent
      },
      {
        path: 'local-rules',
        component: LocalRulesComponent
      }
    ]
  },
  {
    path: 'asset-book',
    component: AssetBookComponent
  }
]; 