<div align="center">

```
██████╗  █████╗ ████████╗ █████╗  ██████╗ ██████╗ ███████╗    ███████╗ ██████╗ ██████╗  ██████╗ ███████╗
██╔══██╗██╔══██╗╚══██╔══╝██╔══██╗██╔═══██╗██╔══██╗██╔════╝    ██╔════╝██╔═══██╗██╔══██╗██╔════╝ ██╔════╝
██║  ██║███████║   ██║   ███████║██║   ██║██████╔╝███████╗    █████╗  ██║   ██║██████╔╝██║  ███╗█████╗
██║  ██║██╔══██║   ██║   ██╔══██║██║   ██║██╔═══╝ ╚════██║    ██╔══╝  ██║   ██║██╔══██╗██║   ██║██╔══╝
██████╔╝██║  ██║   ██║   ██║  ██║╚██████╔╝██║     ███████║    ██║     ╚██████╔╝██║  ██║╚██████╔╝███████╗
╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚══════╝    ╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝
```

# ⚙️ DataOps Forge

**A role-based Test Data Management Engine for QA teams**

[![Status](https://img.shields.io/badge/status-active%20development-7c3aed?style=flat-square)](https://github.com)
[![Version](https://img.shields.io/badge/version-Week%203%20of%205-4c2f9e?style=flat-square)](https://github.com)
[![Stack](https://img.shields.io/badge/stack-HTML%20%7C%20CSS%20%7C%20JS%20%7C%20Node.js-2d1b69?style=flat-square)](https://github.com)
[![License](https://img.shields.io/badge/license-MIT-a78bfa?style=flat-square)](LICENSE)

*Create · Read · Update · Delete · Approve — test data, the right way*

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Pages & Navigation](#-pages--navigation)
- [Role-Based Access Control](#-role-based-access-control)
- [Password Policy](#-password-policy)
- [API Reference](#-api-reference)
- [Data Schemas](#-data-schemas)
- [Testing Types & Dynamic Fields](#-testing-types--dynamic-fields)
- [Development Roadmap](#-development-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🔍 Overview

**DataOps Forge** is a web-based Test Data Management Engine designed for QA and engineering teams. It provides a structured, permission-aware environment where team members can create, read, update, and delete test cases — with every action governed by a six-tier Role-Based Access Control (RBAC) system.

The application is built as a lightweight full-stack project using vanilla HTML, CSS, and JavaScript on the frontend with a Node.js/Express backend, storing all data in flat JSON files — making it easy to run, understand, and extend without a dedicated database.

**Core design goals:**
- Every action is role-scoped — what you can see and do depends on your designation
- Test case structure is dynamic and extensible — adding a new testing type requires no schema changes
- Clean, professional UI built without any frontend framework — just modern CSS and vanilla JS
- A clear 5-week delivery roadmap: Create → Read → Update → Delete → Reports

---

## ✨ Features

### Completed (Weeks 1–3)

**Authentication**
- User registration with full field validation
- Login with session persistence via `sessionStorage`
- Error modals with contextual messaging and Sign Up shortcut
- Password strength meter with live rule checklist (5 rules)
- Show/hide password toggles on all password fields
- Re-enter password confirmation with real-time match validation
- Server-side password policy enforcement (cannot be bypassed via API)

**Role-Based Access Control**
- Six designation tiers: Employee → Senior Employee → Project Lead → Manager → Senior Manager → Director
- Permission badge displayed at registration time showing full access matrix for the chosen role
- RBAC middleware on all backend routes — unauthorized roles receive `403 Forbidden`
- Read scope filtering: Employees see only their own cases; Senior Employees see team cases; Project Lead and above see project/org-wide cases

**Test Case Creation**
- Auto-generated UUID test case ID (collision-proof, timestamp-based)
- 7 common fields: Name, Description, Project, Priority, Environment, Tags, Testing Type
- Dynamic field sections that re-render based on selected testing type — 8 types supported
- Tag chip input: type + Enter or comma to add; Backspace to remove last; × to remove any
- Step builder for procedural testing types: add/remove/auto-renumber steps
- Reset form with confirmation guard
- All fields validated on submit; specific fields highlighted on error
- `isApproved: false` stamped on every new test case; ready for approval workflow

**Test Case Reading**
- RBAC-scoped data fetch — server filters by role before sending
- Role scope banner at top of page (colour-coded per access level)
- 8 simultaneous filters: Search, Project, Testing Type, Priority, Environment, Status, Date From, Date To
- 5 sort options: Date Added, Name, Priority, Type, Last Updated — each with ascending/descending toggle
- Collapsible test case cards showing all common fields + full dynamic data
- Steps render as numbered lists; multi-line data as monospace blocks
- Approval status banners on each card (Draft / Approved)
- Empty state with contextual messaging and Create link

**UI/UX**
- Precision industrial design system: Space Mono for labels + Syne for display text
- Animated background orbs, subtle grid overlay
- Card entrance animations, button ripple effects, input lift-on-focus
- Responsive layout — mobile-friendly at 380px and up
- Persistent top navigation bar on all authenticated pages
- Toast notification system (success / error / info)

---

## 🛠 Tech Stack

| Layer      | Technology                                  |
|------------|---------------------------------------------|
| Frontend   | HTML5, CSS3 (custom properties, animations) |
| Logic      | Vanilla JavaScript (ES2020+)                |
| Backend    | Node.js 18+ with Express 4                  |
| Database   | JSON flat files (`user.json`, `test.json`)  |
| Fonts      | Google Fonts — Syne, Space Mono             |
| No frameworks | No React, Vue, jQuery, Bootstrap, etc.   |

---

## 📁 Project Structure

```
dataops-forge/
│
├── server.js                   # Express server — API routes, RBAC middleware
├── package.json                # Node.js dependencies
│
├── data/
│   ├── user.json               # User database (auto-populated on registration)
│   └── test.json               # Test case database (auto-populated on creation)
│
└── public/                     # Static frontend (served by Express)
    ├── index.html              # Login / Sign-In page
    ├── register.html           # New user registration page
    ├── test.html               # Main dashboard (post-login)
    ├── create_test.html        # Test case creation form
    ├── read_test.html          # Test case viewer with filters
    ├── styles.css              # Shared design system (all pages)
    └── script.js               # All frontend logic (routing, validation, API calls)
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- npm (bundled with Node.js)
- A modern browser (Chrome 110+, Firefox 110+, Edge 110+)

### Installation

**1. Clone the repository**
```bash
git clone https://github.com/your-username/dataops-forge.git
cd dataops-forge
```

**2. Install dependencies**
```bash
npm install
```

**3. Start the server**
```bash
node server.js
```
Or with auto-restart on file changes (development):
```bash
npx nodemon server.js
```

**4. Open the application**
```
http://localhost:3000
```

That's it. No database setup, no environment variables, no build step.

### First Use

1. Open `http://localhost:3000` — you'll see the login page
2. Click **Sign Up** to register a new account
3. Fill in your details and select a position (your permissions are shown immediately)
4. After registration, log in and you'll land on the dashboard
5. Click **Create Test Case** to start forging test data

---

## 🗺 Pages & Navigation

| Page | File | Access | Description |
|------|------|--------|-------------|
| Sign In | `index.html` | Public | Email + password login with error modal |
| Register | `register.html` | Public | Full registration with live permission preview |
| Dashboard | `test.html` | Auth required | Module hub with status of each feature |
| Create Test Case | `create_test.html` | Auth + Create permission | Dynamic test case creation form |
| View Test Cases | `read_test.html` | Auth required | Filtered, sorted, RBAC-scoped case browser |
| *(Update)* | `update_test.html` | *Week 4* | Edit and version test cases |
| *(Delete)* | `delete_test.html` | *Week 4* | Soft/hard delete with role enforcement |
| *(Approve)* | `approve_test.html` | *Week 5* | Approval workflow for Project Lead and above |

---

## 🔐 Role-Based Access Control

Every user is assigned a designation at registration. Permissions are enforced both in the frontend (UI hiding) and backend (API rejection).

| Designation     | Create | Read                 | Update               | Delete                  | Approve               |
|-----------------|--------|----------------------|----------------------|-------------------------|-----------------------|
| Employee        | ✅ Own | ✅ Own only           | ✅ Own Drafts         | ❌                       | ❌ Submit for Review   |
| Senior Employee | ✅     | ✅ Team Test Cases    | ✅ Team Test Cases    | ❌                       | ⚠️ Review & Comment   |
| Project Lead    | ✅     | ✅ Project Test Cases | ✅ Project Test Cases | ⚠️ Soft Delete (Project) | ✅ Approve/Reject       |
| Manager         | ✅     | ✅ Department/Project | ✅ Department/Project | ✅ Soft Delete           | ✅ Manage Users         |
| Senior Manager  | ✅     | ✅ Multiple Projects  | ✅ Multiple Projects  | ✅ Soft Delete + Restore | ✅ Create Templates     |
| Director        | ✅     | ✅ Organization-wide  | ✅ Organization-wide  | ✅ Permanent Delete      | ✅ Governance & Audit   |

**How it works:**

- On the frontend, unauthorized actions are hidden from the UI entirely
- On the backend, every sensitive route passes through `requirePermission(action)` middleware
- If a user's role doesn't have the required permission, the API returns `403 Forbidden`
- The `tier` property (1–6) is used for hierarchical scope calculations (e.g., Senior Employee sees cases created by Employees)

---

## 🔑 Password Policy

Enforced on both the registration form (live feedback) and the server (cannot bypass via direct API calls):

| Rule | Requirement |
|------|-------------|
| Length | Minimum 8 characters |
| Lowercase | At least one lowercase letter (a–z) |
| Letter | At least one letter (any case) |
| Numeral | At least one digit (0–9) |
| Special | At least one special character (`!@#$%^&*` etc.) |

The registration page shows a live strength bar and colour-coded rule checklist that updates on every keystroke. The confirm password field validates match in real time.

---

## 📡 API Reference

Base URL: `http://localhost:3000/api`

### Authentication

#### `POST /api/login`
Authenticate a registered user.

**Request body:**
```json
{
  "email": "jane@company.com",
  "password": "SecurePass1!"
}
```

**Success `200`:**
```json
{
  "success": true,
  "user": {
    "name": "Jane Smith",
    "email": "jane@company.com",
    "employeeId": "EMP-001",
    "position": "Employee"
  }
}
```

**Failure `401`:**
```json
{ "success": false, "message": "Invalid email or password." }
```

---

#### `POST /api/register`
Create a new user account.

**Request body:**
```json
{
  "name": "Jane Smith",
  "position": "Employee",
  "employeeId": "EMP-001",
  "email": "jane@company.com",
  "password": "SecurePass1!"
}
```

**Success `201`:**
```json
{ "success": true, "message": "Registration successful." }
```

**Conflict `409`:**
```json
{ "success": false, "message": "Employee ID already exists." }
```

---

### Projects

#### `GET /api/projects`
Retrieve all available projects.

**Success `200`:**
```json
{
  "success": true,
  "projects": [
    { "id": "PRJ-001", "name": "Project Alpha — Core Platform" },
    { "id": "PRJ-002", "name": "Project Beta — Mobile App" }
  ]
}
```

---

### Test Cases

#### `POST /api/test-cases`
Create a new test case. Requires `create` permission.

**Request body:**
```json
{
  "userPosition": "Employee",
  "employeeId": "EMP-001",
  "payload": {
    "testCaseId": "TC-LQZM8A4K-XY7P",
    "testCaseName": "Login Validation",
    "description": "Verify successful login with valid credentials",
    "projectId": "PRJ-001",
    "testingType": "Functional",
    "testingTypeId": "functional",
    "priority": "High",
    "environment": "QA",
    "tags": ["auth", "login", "smoke"],
    "dynamicData": {
      "preconditions": "User account exists",
      "testSteps": ["Navigate to /login", "Enter valid credentials", "Click Login"],
      "expectedResult": "Dashboard is displayed"
    }
  }
}
```

**Success `201`:**
```json
{
  "success": true,
  "message": "Test case created successfully.",
  "testCaseId": "TC-LQZM8A4K-XY7P"
}
```

**Forbidden `403`:**
```json
{ "success": false, "message": "Role 'Employee' cannot create test cases." }
```

---

#### `GET /api/test-cases`
Retrieve test cases scoped to the user's role.

**Query parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `userPosition` | Yes | The authenticated user's role |
| `employeeId` | Yes | The authenticated user's employee ID |

**Example:**
```
GET /api/test-cases?userPosition=Employee&employeeId=EMP-001
```

**Success `200`:**
```json
{
  "success": true,
  "count": 3,
  "testCases": [ ... ]
}
```

---

## 🗃 Data Schemas

### `user.json` — User record

```json
{
  "name": "Jane Smith",
  "position": "Employee",
  "employeeId": "EMP-001",
  "email": "jane@company.com",
  "password": "SecurePass1!",
  "createdAt": "2026-06-11T10:00:00.000Z",
  "permissions": {
    "create": true,
    "read": "own",
    "update": "own_drafts",
    "delete": false,
    "approve": false,
    "tier": 1
  },
  "testCases": ["TC-LQZM8A4K-XY7P"]
}
```

> ⚠️ **Note:** Passwords are currently stored in plain text in the JSON file. This is appropriate for a local development/demo tool. Production deployments should use `bcrypt` or equivalent hashing.

---

### `test.json` — Test case record

```json
{
  "testCaseId": "TC-LQZM8A4K-XY7P",
  "testCaseName": "Login Validation",
  "description": "Verify successful login with valid credentials",
  "projectId": "PRJ-001",
  "testingType": "Functional",
  "testingTypeId": "functional",
  "priority": "High",
  "environment": "QA",
  "tags": ["auth", "login"],
  "status": "Draft",
  "isApproved": false,
  "approvedBy": null,
  "approvedAt": null,
  "version": 1,
  "isDeleted": false,
  "deletedAt": null,
  "createdBy": "EMP-001",
  "createdByName": "Jane Smith",
  "creatorPosition": "Employee",
  "createdTimestamp": "2026-06-11T10:00:00.000Z",
  "updatedTimestamp": "2026-06-11T10:00:00.000Z",
  "dynamicData": {
    "preconditions": "User account exists and is active",
    "testSteps": [
      "Navigate to the login page",
      "Enter valid username and password",
      "Click the Login button"
    ],
    "inputData": "Username: admin, Password: test123",
    "expectedResult": "Dashboard is displayed successfully",
    "postconditions": "Session token is stored in cookies"
  }
}
```

**Key design decisions:**
- `dynamicData` is a free-form object — adding new testing types never changes the root schema
- `isApproved` is always `false` at creation; the approval workflow (Week 5) will flip this
- `isDeleted` enables soft deletes for roles that support it; hard deletes skip this flag
- `version` increments on each update, preserving a linear history

---

## ⚗️ Testing Types & Dynamic Fields

The form dynamically renders type-specific fields based on the selected testing type. All type-specific data lands in the `dynamicData` object.

| Type | Icon | Key Fields |
|------|------|------------|
| Functional | 🧩 | Preconditions, Test Steps, Input Data, Expected Result, Postconditions |
| API Testing | 🔌 | Endpoint URL, HTTP Method, Request Headers, Request Body, Expected Response, Status Code |
| Performance | ⚡ | Concurrent Users, Ramp-Up Time, Duration, Expected Response Time, Throughput, Error Rate |
| Security | 🛡️ | Threat Vector, Attack Scenario, Target Endpoint, Tools, Expected Secure Behavior, CVSS Score |
| UI / UX | 🖥️ | Component, Browser(s), Viewport, UI Test Steps, Expected UI Behaviour, Accessibility |
| Integration | 🔗 | System A, System B, Integration Flow, Data Format, Preconditions, Expected Outcome |
| Regression | 🔄 | Feature Under Test, Change Reference, Baseline Version, Regression Steps, Expected Result |
| Smoke | 💨 | Build Version, Critical Paths, Go/No-Go Threshold, Environment Health Check |

**Adding a new testing type** requires only one change — add an entry to the `DYNAMIC_FIELD_CONFIGS` object in `script.js`. No HTML, no database schema, no server changes needed.

---

## 📅 Development Roadmap

This project is being built over 5 weekly sprints:

| Week | Feature | Status | Pages |
|------|---------|--------|-------|
| **1** | Authentication — Login & Registration | ✅ **Complete** | `index.html`, `register.html`, `test.html` |
| **1b** | Test Case Creation Form | ✅ **Complete** | `create_test.html` |
| **2** | Read / Query with RBAC Filtering | ✅ **Complete** | `read_test.html` |
| **3** | Password Policy + Confirm Field | ✅ **Complete** | `register.html` |
| **4** | Update Test Cases (versioning) | 🔜 **Next** | `update_test.html` |
| **4b** | Delete (soft + hard, role-scoped) | 🔜 **Next** | — |
| **5** | Approval Workflow | 📋 Planned | `approve_test.html` |
| **5b** | Reports, Audit Log, Templates | 📋 Planned | `reports.html` |

---

## 🤝 Contributing

This project follows a weekly sprint model. To contribute:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes, keeping the existing code style
4. Test all pages at `http://localhost:3000`
5. Commit with a clear message: `git commit -m "feat: add update test case form"`
6. Push and open a pull request

**Code style guidelines:**
- No frontend frameworks — keep it vanilla HTML/CSS/JS
- All page logic lives in `script.js` under its own `initXxxPage()` function, called from the router at the bottom
- All styles live in `styles.css` — group new additions under a clearly labelled week section
- API routes go in `server.js` — use the `requirePermission()` middleware for any route that mutates data
- Every new test case field must land inside `dynamicData` to preserve schema flexibility

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">

Built with ⚙️ by the DataOps Forge team

*Forge better test data.*

</div>
