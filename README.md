# Logistics ERP Dashboard

A complete, production-ready Logistics ERP Dashboard MVP built with Next.js, Tailwind CSS, and Leaflet.

## Features

- **Role-Based Dashboards**: Manager, Supervisor, Driver
- **Real-Time Tracking**: Interactive map using Leaflet
- **Fuel Management**: Verification workflow with charts
- **Trip Management**: Full lifecycle from planning to delivery
- **Mobile First**: Responsive design for drivers

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4
- **State Management**: Zustand
- **Maps**: Leaflet / React-Leaflet
- **Charts**: Recharts
- **Icons**: Heroicons

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000)

## Login Credentials

- **Manager**: `manager@logistics.com` / `demo123`
- **Supervisor**: `supervisor@logistics.com` / `demo123`
- **Driver**: `driver@logistics.com` / `demo123`

## Project Structure

- `src/app`: Next.js App Router pages
- `src/components`: UI components organized by domain
- `src/lib`: Types, detailed mock data, store
- `src/styles`: Global styles and Tailwind configuration

## License

MIT
