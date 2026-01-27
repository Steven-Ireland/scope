# Scope

**Scope** is a lightweight, modern data explorer for Elasticsearch, designed as a minimalist alternative to Kibana. It focuses on speed, simplicity, and a clean user experience for developers who need to quickly browse and search their log data.

## Project Overview

- **Name**: Scope
- **Type**: Single Page Application (SPA) / Data Explorer
- **Primary Goal**: Provide a fast interface for querying and visualizing Elasticsearch indices.
- **Current Status**: MVP (Minimum Viable Product) - Core search and discovery features are implemented.

## Key Features

1.  **Index Discovery**: Automatically fetches and lists available non-system indices from the Elasticsearch cluster.
2.  **Smart Autocomplete**: Search bar suggests field names based on the active index's mapping, facilitating faster query building.
3.  **Shareable URLs**: Application state (index, query, time range) is synchronized with the URL, allowing easy sharing of specific search results.
4.  **Dynamic Data Explorer**: Table columns automatically adjust based on the fields present in the selected index (e.g., handles both `logs-events` and `metrics-data`).
5.  **Minimalist Navigation**: A collapsed, icon-only sidebar for quick access to Search, Index Settings, and App Settings.
6.  **Dark Mode First**: A sleek, dark-themed UI built with `shadcn/ui` and Tailwind CSS, optimized for long coding sessions.
7.  **Local Development Ready**: Includes a Dockerized Elasticsearch instance and a multi-index data seeder (`npm run seed`) to spin up a fully populated environment in seconds.

## Architecture

### Frontend
-   **Framework**: Next.js 16 (App Router)
-   **Styling**: Tailwind CSS v4
-   **Components**: shadcn/ui (Radix UI primitives)
-   **Navigation**: Context-aware dynamic routing (`/[index]`, `/settings/index/[index]`)

### Backend (BFF - Backend for Frontend)
-   **Runtime**: Next.js API Routes
-   **Database Client**: `@elastic/elasticsearch` (v8)
-   **Endpoints**:
    -   `GET /api/indices`: Lists available indices.
    -   `GET /api/fields`: Fetches flattened mapping fields for an index.
    -   `POST /api/search`: Proxies Lucene-style queries to Elasticsearch.

## Quick Start

1.  **Start Infrastructure**:
    ```bash
    docker-compose up -d
    ```
2.  **Seed Data**:
    ```bash
    npm run seed
    ```
3.  **Run Application**:
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000).

## Directory Structure

-   `/app`: Next.js App Router pages and API endpoints.
    -   `/[index]`: Dynamic search view for a specific index.
    -   `/settings`: Index and application configuration pages.
    -   `/api`: Backend proxy routes (`indices`, `fields`, `search`).
-   `/components`: Reusable UI components (Sidebar, SearchInput, UI primitives).
-   `/lib`: Shared utilities (Elasticsearch client, Tailwind merge).
-   `/scripts`: Utility scripts (data seeding).
-   `docker-compose.yml`: Local infrastructure definition.