# Typhoon

## Development Commands

**Core Development:**

- `npm start` - Start development server (localhost:4200)
- `npm run start:dev` - Start dev server with auto-open
- `npm run start:test` - Start with test environment proxy
- `npm run start:stage` - Start with staging environment proxy
- `npm run start:m` - Start with staging proxy and host 0.0.0.0

**Build Commands:**

- `npm run build` - Build for production
- `npm run watch` - Build with watch mode for development
- `npm run publish:build` - Gulp build for publishing
- `npm run publish:dev` - Gulp dev build
- `npm run publish:stage` - Gulp staging build（使用 `--configuration=stage`，隐藏"上海轨道交通"字样）
- `npm run publish:prod` - Gulp production build

**Testing & Formatting:**

- `npm test` - Run unit tests with Karma
- `npm run format` - Format code with Prettier
- `npm run commit` - Use commitizen for conventional commits

**Memory Management:**

- `npm run max` - Increase Node.js memory limit (6000MB)

## Architecture Overview

**Framework:** Angular 19 with TypeScript
**UI Library:** NG-Zorro Ant Design (v19)
**Styling:** Less + Tailwind CSS
**Maps:** Leaflet with Proj4Leaflet
**Charts:** ECharts with ECharts-GL
**Utilities:** Day.js, Lodash ES, D3, Turf.js

### Key Application Structure

- **Pages:** Modular feature areas (COCC, OCC, Dispatch Center, Typhoon Library, etc.)
- **Services:** API services, authentication, HTTP interceptors
- **Common Components:** Reusable UI components (draggable, select, tabs, etc.)
- **Environments:** Multiple environment configs (dev, test, stage, prod)

### Environment Configuration

- `environment.ts` - Base configuration (/api, /tiles endpoints)
- Environment-specific files for different deployment targets
- Proxy configurations for different backend environments

### Key Dependencies

- **Mapping:** Leaflet, Proj4Leaflet, Turf.js, D3
- **Charts:** ECharts, ECharts-GL
- **UI:** NG-Zorro Ant Design, Video.js
- **Utilities:** Day.js, Lodash ES, Crypto-ES, UUID, Zod
- **File Handling:** Docx-preview, PDF viewer, Shapefile support

### Build Configuration

- Multiple build configurations (development, stage, production)
- Asset optimization and budget constraints
- CommonJS dependencies allowlist for compatibility
- SVG icon assets from Ant Design

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 17.0.5.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.
