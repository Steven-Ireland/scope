# Scope

**Scope** is a lightweight, modern data explorer for Elasticsearch, designed as a minimalist alternative to Kibana. It focuses on speed, simplicity, and a clean user experience for developers who need to quickly browse and search their log data.

## Project Overview

- **Name**: Scope
- **Type**: Desktop App (Electron) / Web SPA (React)
- **Primary Goal**: Provide a fast interface for querying and visualizing Elasticsearch indices.
- **Current Status**: MVP (Minimum Viable Product) - Core search, discovery, and basic visualizations are implemented.

## Key Features

1.  **Index Discovery**: Automatically fetches and lists available non-system indices from the Elasticsearch cluster.
2.  **Smart Autocomplete**: Search bar suggests field names based on the active index's mapping.
3.  **Visualizations**: Integrated date histogram to visualize event distribution over time.
4.  **Dynamic Data Explorer**: Table columns automatically adjust based on the fields present in the selected index.
5.  **Flexible Connectivity**: Support for multiple Elasticsearch server configurations via the Server Settings.
6.  **Dark Mode First**: A sleek, dark-themed UI built with `shadcn/ui` and Tailwind CSS v4.
7.  **Local Development Ready**: Includes a Dockerized Elasticsearch instance and a multi-index data seeder (`npm run seed`).

## Architecture

### Frontend
-   **Framework**: React 19 (Vite)
-   **Routing**: React Router v7
-   **Styling**: Tailwind CSS v4
-   **Components**: shadcn/ui (Radix UI primitives)
-   **Visualizations**: Recharts

### Backend / Desktop
-   **Runtime**: Node.js (Express) & Electron
-   **Database Client**: `@elastic/elasticsearch` (v8)
-   **Endpoints**:
    -   `GET /api/indices`: Lists available indices.
    -   `GET /api/fields`: Fetches flattened mapping fields for an index.
    -   `POST /api/search`: Proxies Lucene-style queries and aggregations to Elasticsearch.

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

-   `/src`: Frontend React application.
    -   `/components`: UI components (Sidebar, SearchInput, UI primitives, Date Histogram).
    -   `/pages`: Application pages (Search, App Settings, Server Settings).
    -   `/lib`: Shared utilities and API client.
    -   `/context`: React Context for server and app state.
-   `/electron`: Electron main process, preload scripts, and Express server logic.
-   `/scripts`: Utility scripts (data seeding).
-   `/public`: Static assets.
-   `docker-compose.yml`: Local infrastructure definition.