import { Routes } from '@angular/router';
import { appGuard } from './app.guard';
import { managerRoutes } from './pages/manager/manager.routes';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'login-x5',
    loadComponent: () =>
      import('./pages/login-x5/login-x5.component').then(
        (m) => m.LoginX5Component,
      ),
  },
  {
    path: 'supervisor',
    loadComponent: () =>
      import('./pages/supervisor/supervisor.component').then(
        (m) => m.SupervisorComponent,
      ),
  },
  {
    path: 'manager',
    canActivateChild: [appGuard],
    loadComponent: () =>
      import('./pages/manager/manager.component').then(
        (m) => m.ManagerComponent,
      ),
    children: managerRoutes,
  },
  {
    path: 'portal',
    canActivateChild: [appGuard],
    loadComponent: () =>
      import('./pages/portal/portal.component').then((m) => m.PortalComponent),
  },
  {
    path: 'typhoon-library',
    canActivateChild: [appGuard],
    loadComponent: () =>
      import('./pages/typhoon-library/typhoon-library.component').then(
        (m) => m.TyphoonLibraryComponent,
      ),
  },
  {
    path: 'extreme-weather',
    canActivateChild: [appGuard],
    loadComponent: () =>
      import('./pages/extreme-weather/extreme-weather.component').then(
        (m) => m.ExtremeWeatherComponent,
      ),
  },
  {
    path: 'dispatch-center', // 调度指挥台
    canActivateChild: [appGuard],
    loadComponent: () =>
      import('./pages/dispatch-center/dispatch-center.component').then(
        (m) => m.DispatchCenterComponent,
      ),
  },
  {
    path: 'dispatch-dashboard', // 调度指挥台看板
    canActivateChild: [appGuard],
    loadComponent: () =>
      import('./pages/dispatch-dashboard/dispatch-dashboard.component').then(
        (m) => m.DispatchDashboardComponent,
      ),
  },
  {
    path: 'cocc', // COCC
    canActivateChild: [appGuard],
    loadComponent: () =>
      import('./pages/cocc/cocc.component').then((m) => m.CoccComponent),
  },
  {
    path: 'occ', // OCC
    canActivateChild: [appGuard],
    loadComponent: () =>
      import('./pages/occ/occ.component').then((m) => m.OccComponent),
  },
  {
    path: 'guide',
    canActivateChild: [appGuard],
    loadComponent: () =>
      import('./pages/guide/guide.component').then((m) => m.GuideComponent),
  },
  {
    path: 'case-detail',
    canActivateChild: [appGuard],
    loadComponent: () =>
      import('./pages/case-detail/case-detail.component').then(
        (m) => m.CaseDetailComponent,
      ),
  },
  {
    path: 'digital-plan',
    canActivateChild: [appGuard],
    loadComponent: () =>
      import('./pages/digital-plan/digital-plan.component').then(
        (m) => m.DigitalPlanComponent,
      ),
  },
  {
    path: 'document',
    loadComponent: () =>
      import('./pages/document/document.component').then(
        (m) => m.DocumentComponent,
      ),
  },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
];
