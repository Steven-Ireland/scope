# Scope

> **Note**: This project is currently a **Work in Progress**.

**Scope** is a lightweight, modern data explorer for Elasticsearch, designed as a minimalist alternative to Kibana. It focuses on speed, simplicity, and a clean user experience for developers who need to quickly browse and search their log data.

![Scope Screenshot](docs/screenshot.png)

## Key Features

- **Index Discovery**: Automatically fetches and lists available non-system indices.
- **Smart Autocomplete**: Search bar suggests field names based on the active index's mapping.
- **Shareable URLs**: Application state (index, query, time range, sorting) is synchronized with the URL.
- **Dynamic Data Explorer**: Table columns automatically adjust based on the fields present in the selected index.
- **Sortable Headers**: Clickable column headers that reflect sorting in the Elasticsearch query (supports non-text fields).

## Quick Start

### 1. Prerequisites
- Docker and Docker Compose
- Node.js (v18+)

### 2. Start Infrastructure
Spin up the local Elasticsearch instance:
```bash
docker-compose up -d
```

### 3. Seed Data
Populate Elasticsearch with sample log and metric data:
```bash
npm run seed
```

### 4. Run Application
Start the development server:
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

## Tech Stack
- **Frontend**: Next.js 16 (App Router), React, Tailwind CSS v4
- **UI Components**: shadcn/ui (Radix UI)
- **Icons**: Lucide React
- **Backend**: Next.js API Routes
- **Database**: Elasticsearch v8

## License
MIT