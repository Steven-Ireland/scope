# Implementation Plan: Scope (Minimal Kibana Replacement)

## Goal
Build a basic Elasticsearch data explorer using Next.js, Tailwind CSS, and shadcn/ui.

## Tech Stack
- **Framework**: Next.js (App Router)
- **UI**: Tailwind CSS + shadcn/ui
- **Data**: Elasticsearch Client (Node.js)
- **Dev Environment**: Docker (Elasticsearch)

## Phases

### Phase 1: Infrastructure [COMPLETED]
- [x] **Scaffold Next.js**: Initialize project with TypeScript and Tailwind.
- [x] **Setup shadcn/ui**: Install core components (Button, Select, Input, Table).
- [x] **Docker**: `docker-compose.yml` for a local Elasticsearch instance.
- [x] **Data Seeder**: Script to generate structured event data (logs and metrics).

### Phase 2: Backend API [COMPLETED]
- [x] **Elasticsearch Proxy**: API routes to:
   - [x] List indices (`/api/indices`).
   - [x] Fetch field mappings for autocomplete (`/api/fields`).
   - [x] Execute search queries with time filtering and text search (`/api/search`).

### Phase 3: Frontend Implementation [COMPLETED]
- [x] **Navigation**: Collapsed icon-only sidebar with context-aware routing.
- [x] **Smart Query Bar**: Autocomplete for field names and shareable URL state.
- [x] **Dynamic Results Table**: Automatic column rendering based on index schema.
- [x] **Settings**: Placeholder pages for Index and App configuration.

### Phase 4: Polish & Refinement [COMPLETED]
- [x] **Dark Mode**: Enforced dark mode globally.
- [x] **URL Sync**: Clean URL management (path-based indices, query parameters for filters).
- [x] **Multi-Index Support**: Seamless switching between different data shapes.

### Phase 5: Advanced Features [PLANNED]
- [ ] **Visualizations**: Add basic charts (Bar/Pie) for data aggregation.
- [ ] **Saved Searches**: Allow users to save and name specific query/time combinations.
- [ ] **Field Explorer**: A detailed view of field types and distribution statistics.

## Development Workflow
1. `docker-compose up -d`
2. `npm run seed`
3. `npm run dev`