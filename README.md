# Inventory Catalog Manager

Welcome to the Inventory Catalog Manager project! This application allows users to register, log in, and manage inventory items (add, update, delete) through a modern web interface and robust backend API.


## Overview

The Inventory Catalog Manager consists of:
- **Frontend:** A user-friendly interface for managing inventory.
- **Backend:** A RESTful API for authentication and inventory operations.
- **Automated Tests:** End-to-end (E2E) and API tests to ensure application quality.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v20 or higher recommended)
- [npm](https://www.npmjs.com/)
- [Git](https://git-scm.com/) (optional, for cloning the repository)

---

### Setup Instructions

Clone the repository and navigate to the project directory:

```sh
git clone https://github.com/karicharlamounika/Inventory_Catalog_Manager.git
cd Inventory_Catalog_Manager
```

---

## Running the Application

**The backend and frontend must be running before executing any tests.**

### Backend Setup

- **Linux/macOS (bash):**
  ```sh
  ./setup_backend.sh
  ```
- **Windows (CMD/PowerShell):**
  ```bat
  setup_backend.bat
  ```
  
### Frontend Setup

- **Linux/macOS (bash):**
  ```sh
  ./setup_frontend.sh
  ```
- **Windows (CMD/PowerShell):**
  ```bat
  setup_frontend.bat
  ```

---

## Running Tests

After both frontend and backend are running, you can execute the automated tests.

- **Linux/macOS (bash):**
  ```sh
  ./run_tests.sh
  ```
- **Windows (CMD/PowerShell):**
  ```bat
  run_tests.bat
  ```

This will run both API and E2E tests in sequence on local setup.

### Running Tests via GitHub Actions (CI)

Automated tests are also executed as part of the project's Continuous Integration (CI) pipeline using GitHub Actions.  
Worflow is configure to be trigerred manaully, once triggered all tests would run after building the backend and frontend automatically.  
You can view the workflow configuration in the .github/workflows directory and check test results directly on the GitHub repository's Actions tab.

Note: This workflow can be configured to trigger on both pull and pust of code to repository.

---


## Test Plan

For a detailed description of the testing strategy, scenarios, and tools used, please refer to the [Test Plan](Test_plan.md).

---