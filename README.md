<div align="center">

```
██████╗  █████╗ ████████╗ █████╗  ██████╗ ██████╗ ███████╗    ███████╗ ██████╗ ██████╗  ██████╗ ███████╗
██╔══██╗██╔══██╗╚══██╔══╝██╔══██╗██╔═══██╗██╔══██╗██╔════╝    ██╔════╝██╔═══██╗██╔══██╗██╔════╝ ██╔════╝
██║  ██║███████║   ██║   ███████║██║   ██║██████╔╝███████╗    █████╗  ██║   ██║██████╔╝██║  ███╗█████╗
██║  ██║██╔══██║   ██║   ██╔══██║██║   ██║██╔═══╝ ╚════██║    ██╔══╝  ██║   ██║██╔══██╗██║   ██║██╔══╝
██████╔╝██║  ██║   ██║   ██║  ██║╚██████╔╝██║     ███████║    ██║     ╚██████╔╝██║  ██║╚██████╔╝███████╗
╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚══════╝    ╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝
```

# ⚙️ DataOps Forge — Test Data Management Engine

DataOps Forge is an enterprise-oriented Test Data Management (TDM) platform for creating, managing, reviewing, approving, and maintaining test cases through a Role-Based Access Control (RBAC) workflow.

---

## Current Features

- ✅ User Authentication (Login & Registration)
- ✅ Role-Based Access Control (RBAC)
- ✅ Dashboard
- ✅ Create Test Cases with Dynamic Testing Templates
- ✅ Read & Search Test Cases
- ✅ Update Test Cases with Version Reset to Draft
- ✅ Soft Delete / Restore / Permanent Delete (role-based)
- ✅ Review & Approval Workflow
- ✅ Project Management Integration
- ✅ JSON-based Test Case Storage

---

## Project Structure

```text
dataops-forge/
├── server.js
├── package.json
├── data/
│   ├── user.json
│   └── test.json
└── public/
    ├── index.html
    ├── register.html
    ├── test.html
    ├── create_test.html
    ├── read_test.html
    ├── update_test.html
    ├── approve_test.html
    ├── styles.css
    └── script.js
```

---

## Setup

### Install Dependencies

```bash
npm install
```

### Start the Server

```bash
node server.js
```

or

```bash
npx nodemon server.js
```

### Open the Application

```
http://localhost:3000
```

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
| Director        | ✅     | ✅ Organization-wide  | ✅ Organization-wide  | ✅ Permanent Delete      | ✅ Governance & Audit   |## RBAC Designations

| Designation | Key Permissions |
|-------------|-----------------|
| Employee | Create, Read Own, Update Own Drafts |
| Senior Employee | Team Read/Update, Review Test Cases |
| Project Lead | Review, Approve/Reject, Soft Delete |
| Manager | Department Management, Soft Delete |
| Senior Manager | Restore, Multi-project Management |
| Director | Organization-wide Access, Permanent Delete |

---

## Test Case Workflow

```text
Create
   ↓
Draft
   ↓
Review
   ↓
Reviewed
   ↓
Approve / Reject
   ├── Approved
   └── Rejected

Any modification to a Reviewed or Rejected test case automatically resets its status to Draft and sends it back through the review workflow.
```

---

## API Overview

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | /api/login | User authentication |
| POST | /api/register | User registration |
| GET | /api/projects | Retrieve projects |
| POST | /api/test-cases | Create test case |
| GET | /api/test-cases | Read test cases |
| PUT | /api/test-cases/:id | Update test case |
| DELETE | /api/test-cases/:id | Delete test case |
| POST | /api/test-cases/:id/restore | Restore soft-deleted test case |
| POST | /api/test-cases/:id/review | Review test case |
| POST | /api/test-cases/:id/approve | Approve test case |
| POST | /api/test-cases/:id/reject | Reject test case |

---

## Data Storage

### user.json

Stores user information, authentication details, assigned role, and associated test case IDs.

### test.json

Stores:

- Test case metadata
- Dynamic testing fields
- Review status
- Approval status
- Version information
- Creator and approver details
- Soft delete information
- Timestamps

---

## Tech Stack

- Node.js
- Express.js
- HTML5
- CSS3
- Vanilla JavaScript
- JSON File Storage

---

## Current Status

DataOps Forge currently supports the complete lifecycle of enterprise test case management:

- Authentication
- RBAC
- Create
- Read
- Update
- Delete
- Review
- Approval

The application is designed so that any modification to an existing test case re-enters the governance workflow by resetting its status to **Draft**, ensuring reviewed and approved data remains controlled and traceable.


## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">

Built with ⚙️ by the DataOps Forge team

*Forge better test data.*

</div>
