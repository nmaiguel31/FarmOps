import { Routes } from '@angular/router';

import { Login } from './pages/login/login';
import { Dashboard } from './pages/dashboard/dashboard';
import { Farms } from './pages/farms/farms';
import { Crops } from './pages/crops/crops';
import { FinancialRecords } from './pages/financial-records/financial-records';
import { OperationsCenter } from './pages/operations-center/operations-center';
import { Weather } from './pages/weather/weather';
import { NdviAnalysis } from './pages/ndvi-analysis/ndvi-analysis';
import { ExecutiveReports } from './pages/executive-reports/executive-reports';
import { Profile } from './pages/profile/profile';
import { UserManagement } from './pages/user-management/user-management';
import { AccessDenied } from './pages/access-denied/access-denied';
import {
  authGuard,
  mfaAccessGuard,
  publicAuthGuard,
  roleGuard
} from './guards/auth-guard';
import { MfaComponent } from './pages/mfa/mfa';

export const routes: Routes = [

  {
    path: '',
    component: Login,
    canActivate: [publicAuthGuard]
  },

  {
    path: 'login',
    component: Login,
    canActivate: [publicAuthGuard]
  },

  {
    path: 'dashboard',
    component: Dashboard,
    canActivate: [authGuard, roleGuard]
  },
  
  {
    path: 'farms',
    component: Farms,
    canActivate: [authGuard, roleGuard]
  },

  {
    path: 'crops',
    component: Crops,
    canActivate: [authGuard, roleGuard]
  },

  {
    path: 'financial-records',
    component: FinancialRecords,
    canActivate: [authGuard, roleGuard]
  },

  {
    path: 'operations-center',
    component: OperationsCenter,
    canActivate: [authGuard, roleGuard]
  },

  {
    path: 'weather',
    component: Weather,
    canActivate: [authGuard, roleGuard]
  },

  {
    path: 'ndvi',
    component: NdviAnalysis,
    canActivate: [authGuard, roleGuard]
  },

  {
    path: 'reports',
    component: ExecutiveReports,
    canActivate: [authGuard, roleGuard]
  },

  {
    path: 'users',
    component: UserManagement,
    canActivate: [authGuard, roleGuard]
  },

  {
    path: 'admin/users',
    redirectTo: 'users',
    pathMatch: 'full'
  },

  {
    path: 'profile',
    component: Profile,
    canActivate: [authGuard, roleGuard]
  },

  {
    path: 'access-denied',
    component: AccessDenied,
    canActivate: [authGuard]
  },

  {
    path: 'operations',
    redirectTo: 'operations-center',
    pathMatch: 'full'
  },

  {
  path: 'mfa',
  component: MfaComponent,
  canActivate: [mfaAccessGuard]
  }

];
