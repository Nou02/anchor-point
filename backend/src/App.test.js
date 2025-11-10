import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock the components that might cause issues in testing
jest.mock('./components/LoginSignUp', () => {
  return function MockLoginSignUp() {
    return <div data-testid="login-signup">Login/SignUp Component</div>;
  };
});

jest.mock('./components/Homepage', () => {
  return function MockHomepage() {
    return <div data-testid="homepage">Homepage Component</div>;
  };
});

describe('App Component', () => {
  test('renders without crashing', () => {
    render(<App />);
    expect(screen.getByTestId('login-signup')).toBeInTheDocument();
  });

  test('shows login component initially', () => {
    render(<App />);
    expect(screen.getByTestId('login-signup')).toBeInTheDocument();
    expect(screen.queryByTestId('homepage')).not.toBeInTheDocument();
  });
});
