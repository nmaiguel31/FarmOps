import { Routes } from '@angular/router';

import { Login } from './pages/login/login';
import { Dashboard } from './pages/dashboard/dashboard';
import { Farms } from './pages/farms/farms';
import { Crops } from './pages/crops/crops';
import { FinancialRecords } from './pages/financial-records/financial-records';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [

  { path: '', component: Login },

  {
    path: 'dashboard',
    component: Dashboard,
    canActivate: [authGuard]
  },

  {
    path: 'farms',
    component: Farms,
    canActivate: [authGuard]
  },

  {
    path: 'crops',
    component: Crops,
    canActivate: [authGuard]
  },

  {
    path: 'financial-records',
    component: FinancialRecords,
    canActivate: [authGuard]
  }

];