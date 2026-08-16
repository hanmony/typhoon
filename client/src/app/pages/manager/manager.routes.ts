import { Routes } from '@angular/router';

export const managerRoutes: Routes = [
  {
    path: 'list',
    loadComponent: () =>
      import('./case.list/case.list.component').then(
        (m) => m.CaseListComponent,
      ),
  },
  {
    path: 'document-list',
    loadComponent: () =>
      import('./document.list/document.list.component').then(
        (m) => m.DocumentListComponent,
      ),
  },
  {
    path: 'editor',
    loadComponent: () =>
      import('./case.editor/case.editor.component').then(
        (m) => m.CaseEditorComponent,
      ),
  },
  {
    path: 'user-list',
    loadComponent: () =>
      import('./user.list/user.list.component').then(
        (m) => m.UserListComponent,
      ),
  },
  {
    path: 'log-list',
    loadComponent: () =>
      import('./log.list/log.list.component').then((m) => m.LogListComponent),
  },
  {
    path: 'knowledge-base',
    loadComponent: () =>
      import('./knowledge-base/knowledge-base.component').then(
        (m) => m.KnowledgeBaseComponent,
      ),
  },
  {
    path: 'ai-chat',
    loadComponent: () =>
      import('./ai-chat/ai-chat.component').then((m) => m.AiChatComponent),
  },
  {
    path: 'llm-models',
    loadComponent: () =>
      import('./llm-models/llm-models.component').then((m) => m.LlmModelsComponent),
  },
  { path: '', pathMatch: 'full', redirectTo: 'list' },
];
