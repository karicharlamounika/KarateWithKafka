# Monorepo Project: Karate with Kafka

This monorepo contains two main components: a backend service built with Node.js and a QA testing suite using Maven and Karate for integration testing.

## Project Structure

```
├── README.md
├── .github/
├── appmod/
│   └── appcat/
├── backend/
│   ├── .gitignore
│   ├── package.json
│   ├── api_test_results/
│   ├── auth-service/
│   ├── gateway-service/
│   ├── item-read-service/
│   ├── item-service/
│   └── item-writer-service/
├── qa-tests/
│   ├── .gitignore
│   ├── karate-config.js
│   ├── pom.xml
│   ├── rewrite.yml
│   ├── run-upgrade.bat
│   └── src/
└── target/
```

## Backend

The backend is built using Node.js and npm. It consists of multiple microservices, including:

- **Auth Service**: Handles user authentication.
- **Gateway Service**: Acts as an API gateway for routing requests.
- **Item Services**: Manages item-related operations.

### Getting Started

1. Navigate to the `backend` directory.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the server:

   ```bash
   npm start
   ```

## QA Tests

The QA tests are implemented using Maven and Karate, focusing on integration tests for the microservices.

### Getting Started with QA Tests

1. Navigate to the `qa-tests` directory.
2. Build the project:

   ```bash
   mvn clean install
   ```

3. Run the tests:

   ```bash
   mvn test
   ```

### Test Features

- **Add Item and Verify Integration Test**: Tests the flow of adding an item and verifying it through Kafka and the database.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.