# Test Plan: Inventory Catalog Manager

## 1. Introduction
This document outlines the testing strategy for the Inventory Catalog Manager application, which allows users to register, log in, and manage inventory items (add, update, delete).

## 2. Scope

### 2.1 Scenarios
- **User Registration & Login:** 
  - New user registration
  - Login with valid credentials
  - Login with invalid credentials
- **Inventory Management:** 
  - Adding items as logged-in users
  - Updating items as logged-in users
  - Deleting items as logged-in users

### 2.2 Test Types
- **End-to-End (E2E) Tests:** Validate user flows via UI.
  - Register new user → Log in
  - Log in → Add item → Update item → Delete item
- **API Tests:** Validate backend endpoints for:
  - New User Registration (POST)
  - Login (POST)
  - Add item (POST)
  - Get items (GET)
  - Update item (PUT)
  - Delete item (DELETE)
  - Error handling
    - Registering user already exists
    - Unauthorized user login
    - Unauthorized user accessing catalogue items
    - Deleting non-existent item
    

## 3. Out of Scope
- Unit tests for backend APIs
- Component tests for frontend components
- Performance and load testing
- Security penetration testing
- Cross-browser compatibility (unless specified)

## 4. Tools Used

- **Playwright:** For E2E/UI automation due to its reliability, speed, and cross-browser support.
- **Postman + Newman:** For API testing and automated execution via CI and locally, enabling easy validation of REST endpoints and error codes.

## 5. Assumptions / Limitations

- Test data is hard coded for api and UI both. While rer-unning tests locally update email in testData.json for e2e and       catalogmanger.postman_collection.json for api
- Only functional aspects are covered; non-functional requirements are excluded.
- ELement state validations are not covered as they are component testing scenarios
- Scennarios related to invalid login credentials is limited to API tests to avoid retundancy of tests

## 6. How to Run the Tests: 
* [Refer project README.md](README.md)