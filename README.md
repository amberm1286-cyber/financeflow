# FinanceFlow 

A modern personal finance intelligence platform designed to help users track spending, manage budgets, monitor subscriptions, analyze financial habits, and make smarter money decisions through an intuitive fintech-style dashboard experience.

**Live Demo:** https://financeflowhq.netlify.app

---

## Overview

FinanceFlow HQ is a portfolio-grade web application built to simulate a modern personal finance SaaS platform.

The application combines financial tracking, budgeting, analytics, subscription management, reporting, and productivity-focused UI/UX into a single responsive web experience.

The goal of this project was to build a realistic product-level frontend application using pure web technologies while focusing heavily on modular architecture, responsive design, data persistence, debugging, and polished user experience.

---

## Features

### Dashboard
- Financial overview dashboard
- Total balance, income, expenses, and net savings cards
- Financial score system
- AI-inspired spending insights
- Top spending categories
- Upcoming bills widget
- Budget burn rate tracking
- Net worth tracker
- 50/30/20 budgeting analysis
- Floating quick-add transaction system

---

### Transaction Management
- Add income and expense transactions
- Edit existing transactions
- Delete individual transactions
- Bulk transaction deletion
- Transaction filtering and search
- Category management
- Payment method tagging
- Notes and transaction metadata
- Smart categorization logic
- CSV import support
- Simulated OCR receipt scanner

---

### Analytics
- Spending heatmap
- Category spending breakdown
- Income vs expense visualizations
- Trend analysis
- Spending pattern analytics
- Interactive financial insights
- Comparative analysis tools
- Custom chart rendering

---

### Budget Management
- Monthly category budgets
- Real-time usage tracking
- Budget progress indicators
- Smart warning alerts
- Overspending detection
- Suggested budget insights
- Budget performance history

---

### Savings Goals
- Create multiple savings goals
- Progress visualization
- Fund allocation tools
- Completion forecasting
- Goal milestone celebration animations
- Priority-based goal management

---

### Subscription Tracker
- Subscription management dashboard
- Recurring billing tracking
- Monthly and yearly subscription cost calculations
- Upcoming billing reminders
- Duplicate subscription detection
- Cost filtering and sorting

---

### Reports
- Financial reporting dashboard
- Monthly summaries
- Expense breakdown analysis
- Subscription reporting
- Goal reporting
- PDF export functionality

---

### Settings & Personalization
- Theme switching (dark/light)
- Currency converter
- User profile customization
- Data import/export
- Notification preferences
- Custom category management
- Local data reset/demo data restore

---

### Sync & Persistence
- LocalStorage persistence
- Auto-save functionality
- Cross-tab sync simulation using BroadcastChannel API
- Session continuity

---

## Tech Stack

### Frontend
- HTML5
- CSS3
- Vanilla JavaScript (ES Modules)

### Libraries
- Chart.js
- jsPDF
- canvas-confetti

### Deployment
- Netlify

### Storage
- LocalStorage
- BroadcastChannel API

---

## Project Architecture

```text
finance-flow/
├── index.html
├── css/
│   ├── styles.css
│   ├── dashboard.css
│   ├── transactions.css
│   ├── analytics.css
│   ├── budget.css
│   ├── goals.css
│   ├── subscriptions.css
│   ├── reports.css
│   ├── settings.css
│   └── responsive.css
│
├── js/
│   ├── app.js
│   ├── config.js
│   ├── dataManager.js
│   ├── uiManager.js
│   ├── chartManager.js
│   ├── analyticsEngine.js
│   ├── pdfExporter.js
│   ├── notificationSystem.js
│   ├── syncManager.js
│   ├── utils.js
│   └── modules/
│       ├── dashboard.js
│       ├── transactions.js
│       ├── analytics.js
│       ├── budget.js
│       ├── goals.js
│       ├── subscriptions.js
│       ├── reports.js
│       └── settings.js
│
└── assets/
```

---

## Development Focus

#### This project was built with emphasis on:

- Modular architecture
- Scalable frontend organization
- Realistic product UI/UX
- Responsive design
- Financial dashboard design patterns
- Data persistence logic
- State management concepts
- Debugging and integration workflows
- Feature-rich frontend engineering

---

## Key Learning Outcomes

#### Through this project, I strengthened my understanding of:

- JavaScript application architecture
- DOM manipulation
- Event-driven UI systems
- Local state management
- Frontend debugging
- Data visualization
- User-focused interface design
- Responsive layout engineering
- Modular code organization
- Real-world project deployment

---

## Future Improvements

#### Potential production enhancements:

- Backend integration
- User authentication
- Cloud database storage
- Real OCR implementation
- Real exchange rate APIs
- Email notifications
- Multi-user sync
- Secure account system
- PWA/mobile app support

---

## Author

Amber Mahajan
