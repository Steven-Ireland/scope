# Scope

**Scope** is a lightweight, modern data explorer for Elasticsearch, designed as a minimalist alternative to Kibana. It focuses on speed, simplicity, and a clean user experience for developers who need to quickly browse and search their log data.

## Project Overview

- **Name**: Scope
- **Type**: Desktop App (Electron) / Web SPA (React)
- **Primary Goal**: Provide a fast interface for querying and visualizing Elasticsearch indices.
- **Current Status**: MVP+ - Core search, discovery, persistent tabs, and multi-version support are implemented.

## Key Features

1.  **Index Discovery & Patterns**: Automatically fetches indices and supports custom index patterns (e.g., `logs-*`) for grouping date-based indices.
2.  **Persistent Search Tabs**: Supports multiple concurrent search sessions with state persistence (index, query, filters, and columns) across restarts. Supports custom tab naming and drag-and-drop reordering.
3.  **Column Management**: Interactive column selector to toggle visibility and drag-to-reorder fields for customized data views.
4.  **Flexible Time Ranges**: Support for both absolute date ranges and relative time offsets (e.g., "Last 15 minutes").
5.  **Smart Autocomplete**: Search bar suggests field names and values based on the active index's mapping.
6.  **Multi-Version Support**: Dynamic detection and support for Elasticsearch 7.x, 8.x, and 9.x.
7.  **Visualizations**: Integrated date histogram to visualize event distribution over time with automatic bucket sizing.
8.  **Document Inspection**: Deep-dive into individual documents with a formatted JSON viewer.
9.  **Flexible Connectivity**: Support for multiple Elasticsearch configurations, including Basic Auth, SSL/TLS (custom certificates), and an "Insecure SSL" mode for local development.
7.  **Nord Theme**: A clean, professional UI inspired by the Nord color palette, built with Radix UI and Tailwind CSS v4.
8.  **Local Development Ready**: Includes a Dockerized Elasticsearch instance and a multi-index data seeder (`npm run seed`).

## Architecture

### Frontend

- **Framework**: React 19 (Vite)
- **Data Fetching**: TanStack Query v5
- **State Management**: Zustand (with persistence)
- **Routing**: React Router v7
- **Styling**: Tailwind CSS v4 (Nord theme)
- **Components**: Radix UI primitives & Lucide icons
- **Drag & Drop**: dnd-kit (for column and tab reordering)
- **Visualizations**: Recharts

### Backend / Desktop

- **Runtime**: Node.js (Express) & Electron
- **Configuration**: Shared `config.json` read directly from disk for zero-latency sync and improved security.
- **Database Client**: Dynamic versioning support for `@elastic/elasticsearch` (v7, v8, v9) with intelligent connection pooling and auto-invalidation on configuration changes.
- **Networking**: `undici` for high-performance HTTP requests
- **Endpoints**:
  - `GET /api/indices`: Lists available indices and applies pattern grouping.
  - `GET /api/fields`: Fetches flattened mapping fields for an index or pattern.
  - `GET /api/values`: Provides autocomplete suggestions for field values.
  - `POST /api/search`: Proxies Lucene-style queries and aggregations to Elasticsearch.
  - `GET /api/verify-server`: Validates connection and detects ES version.

## Quick Start

1.  **Start Infrastructure**:
    ```bash
    docker-compose up -d
    ```
2.  **Seed Data**:
    ```bash
    npm run seed
    ```
3.  **Run Web Application**:
    ```bash
    npm run dev
    ```
4.  **Run Electron Application**:
    ```bash
    npm run electron-dev
    ```

## Directory Structure

- `/src`: Frontend React application.
  - `/components`: UI components (Tabs, Sidebar, SearchInput, Date Histogram).
  - `/pages`: Application pages (Search, App Settings, Server Settings).
  - `/store`: Zustand stores for search and configuration.
  - `/lib`: Shared utilities and API client.
- `/electron`: Electron main process, preload scripts, and Express server logic.
- `/scripts`: Utility scripts (data seeding, release management).
- `/public`: Static assets.
- `docker-compose.yml`: Local infrastructure definition.
