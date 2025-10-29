# AnchorPoint Testing Guide

This document provides comprehensive information about testing the AnchorPoint application.

## Overview

The AnchorPoint application includes both backend (Flask) and frontend (React) testing to ensure reliability and maintainability.

## Backend Testing (Flask)

### Test Framework
- **pytest**: Primary testing framework
- **pytest-flask**: Flask-specific testing utilities
- **pytest-cov**: Coverage reporting

### Test Structure
```
backend/
├── test_app.py          # Main test file
├── pytest.ini          # Pytest configuration
├── run_tests.py         # Test runner script
└── requirements.txt     # Test dependencies
```

### Running Backend Tests

#### Option 1: Using pytest directly
```bash
cd backend
pip install -r requirements.txt
pytest test_app.py -v
```

#### Option 2: Using the test runner script
```bash
cd backend
python run_tests.py
```

#### Option 3: With coverage report
```bash
cd backend
pytest test_app.py -v --cov=app --cov-report=html
```

### Test Coverage

The backend tests cover:
- ✅ **Authentication endpoints** (login, register, user management)
- ✅ **Ship management** (get ships, get crew)
- ✅ **Excel operations** (read, append, save report, delete report)
- ✅ **Analytics** (dashboard analytics)
- ✅ **Error handling** (invalid JSON, missing data)
- ✅ **Data validation** (date formats, required fields)

### Test Classes

1. **TestHealthCheck**: Basic API health verification
2. **TestAuthentication**: Login/register functionality
3. **TestUserManagement**: User CRUD operations
4. **TestShipManagement**: Ship and crew data
5. **TestExcelOperations**: Excel file manipulation
6. **TestAnalytics**: Dashboard analytics
7. **TestErrorHandling**: Error scenarios

## Frontend Testing (React)

### Test Framework
- **Jest**: Testing framework (included with Create React App)
- **React Testing Library**: Component testing utilities
- **@testing-library/user-event**: User interaction simulation

### Test Structure
```
src/
├── setupTests.js           # Test configuration
├── App.test.js            # Main app tests
└── components/
    ├── Dashboard.test.js   # Dashboard component tests
    ├── LoginSignUp.test.js # Authentication tests
    └── Report.test.js      # Report component tests
```

### Running Frontend Tests

#### Option 1: Run all tests
```bash
npm test
```

#### Option 2: Run tests with coverage
```bash
npm run test:coverage
```

#### Option 3: Run tests in CI mode
```bash
npm run test:ci
```

### Test Coverage

The frontend tests cover:
- ✅ **Component rendering** (App, Dashboard, LoginSignUp, Report)
- ✅ **User interactions** (form submissions, button clicks)
- ✅ **Form validation** (required fields, email format, password length)
- ✅ **API integration** (mocked API calls)
- ✅ **Loading states** (async operations)
- ✅ **Error handling** (API failures, validation errors)

### Test Files

1. **App.test.js**: Main application component
2. **Dashboard.test.js**: Dashboard analytics and data display
3. **LoginSignUp.test.js**: Authentication forms and validation
4. **Report.test.js**: Vessel reports management

## Test Data

### Backend Test Data
- Mock users for authentication testing
- Temporary Excel files for file operation testing
- Sample vessel and crew data

### Frontend Test Data
- Mocked API responses
- Sample analytics data
- Test user credentials

## Continuous Integration

### Backend CI
```bash
# Install dependencies
pip install -r requirements.txt

# Run tests
pytest test_app.py -v --cov=app --cov-report=xml
```

### Frontend CI
```bash
# Install dependencies
npm install

# Run tests
npm run test:ci
```

## Coverage Reports

### Backend Coverage
- HTML report: `backend/htmlcov/index.html`
- Terminal output shows line-by-line coverage
- Target: >80% coverage

### Frontend Coverage
- HTML report: `coverage/lcov-report/index.html`
- Terminal output shows file-by-file coverage
- Target: >80% coverage

## Best Practices

### Writing Tests
1. **Test one thing at a time**: Each test should verify a single behavior
2. **Use descriptive names**: Test names should clearly describe what's being tested
3. **Arrange-Act-Assert**: Structure tests with setup, execution, and verification
4. **Mock external dependencies**: Use mocks for API calls and external services
5. **Test edge cases**: Include tests for error conditions and boundary values

### Test Maintenance
1. **Keep tests up to date**: Update tests when changing functionality
2. **Remove obsolete tests**: Delete tests for removed features
3. **Refactor test code**: Keep test code clean and maintainable
4. **Monitor coverage**: Ensure test coverage doesn't decrease

## Troubleshooting

### Common Issues

#### Backend Tests
- **Import errors**: Ensure all dependencies are installed
- **File not found**: Check Excel file paths in tests
- **Database errors**: Tests use temporary files, not real database

#### Frontend Tests
- **Component not found**: Check import paths and component names
- **Mock errors**: Verify mock implementations match actual API
- **Async issues**: Use `waitFor` for async operations

### Debugging Tests
```bash
# Backend: Run specific test with verbose output
pytest test_app.py::TestAuthentication::test_login_success -v -s

# Frontend: Run tests in watch mode
npm test -- --watch
```

## Performance Testing

### Backend Performance
- Test response times for API endpoints
- Verify Excel operations don't timeout
- Check memory usage with large datasets

### Frontend Performance
- Test component render times
- Verify smooth user interactions
- Check for memory leaks in long-running tests

## Security Testing

### Backend Security
- Test authentication and authorization
- Verify input validation and sanitization
- Check for SQL injection vulnerabilities

### Frontend Security
- Test XSS prevention
- Verify secure data handling
- Check for sensitive data exposure

## Future Improvements

1. **Integration Tests**: Add end-to-end testing
2. **Performance Tests**: Add load testing for API endpoints
3. **Visual Regression Tests**: Add screenshot comparison tests
4. **Accessibility Tests**: Add a11y testing for UI components
5. **Mobile Testing**: Add responsive design tests

## Resources

- [pytest Documentation](https://docs.pytest.org/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Flask Testing](https://flask.palletsprojects.com/en/2.3.x/testing/)
