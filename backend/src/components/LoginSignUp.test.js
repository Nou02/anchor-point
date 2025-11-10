import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginSignUp from './LoginSignUp';

// Mock the API service
jest.mock('../services/api', () => ({
  post: jest.fn()
}));

// Mock Firebase
jest.mock('../firebase/config', () => ({
  auth: {
    signInWithEmailAndPassword: jest.fn(),
    createUserWithEmailAndPassword: jest.fn(),
    signOut: jest.fn()
  }
}));

describe('LoginSignUp Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders login form by default', () => {
    render(<LoginSignUp />);
    
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  test('switches to signup form when clicking signup tab', () => {
    render(<LoginSignUp />);
    
    const signupTab = screen.getByText('Sign Up');
    fireEvent.click(signupTab);
    
    expect(screen.getByText('Sign Up')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Full Name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
  });

  test('switches back to login form when clicking login tab', () => {
    render(<LoginSignUp />);
    
    // Switch to signup first
    const signupTab = screen.getByText('Sign Up');
    fireEvent.click(signupTab);
    
    // Switch back to login
    const loginTab = screen.getByText('Login');
    fireEvent.click(loginTab);
    
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  test('validates required fields in login form', async () => {
    render(<LoginSignUp />);
    
    const loginButton = screen.getByRole('button', { name: /login/i });
    fireEvent.click(loginButton);
    
    await waitFor(() => {
      expect(screen.getByText('Please enter your email')).toBeInTheDocument();
      expect(screen.getByText('Please enter your password')).toBeInTheDocument();
    });
  });

  test('validates required fields in signup form', async () => {
    render(<LoginSignUp />);
    
    // Switch to signup
    const signupTab = screen.getByText('Sign Up');
    fireEvent.click(signupTab);
    
    const signupButton = screen.getByRole('button', { name: /sign up/i });
    fireEvent.click(signupButton);
    
    await waitFor(() => {
      expect(screen.getByText('Please enter your full name')).toBeInTheDocument();
      expect(screen.getByText('Please enter your email')).toBeInTheDocument();
      expect(screen.getByText('Please enter your password')).toBeInTheDocument();
    });
  });

  test('validates email format', async () => {
    render(<LoginSignUp />);
    
    const emailInput = screen.getByPlaceholderText('Email');
    const passwordInput = screen.getByPlaceholderText('Password');
    const loginButton = screen.getByRole('button', { name: /login/i });
    
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(loginButton);
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });
  });

  test('validates password length in signup', async () => {
    render(<LoginSignUp />);
    
    // Switch to signup
    const signupTab = screen.getByText('Sign Up');
    fireEvent.click(signupTab);
    
    const nameInput = screen.getByPlaceholderText('Full Name');
    const emailInput = screen.getByPlaceholderText('Email');
    const passwordInput = screen.getByPlaceholderText('Password');
    const signupButton = screen.getByRole('button', { name: /sign up/i });
    
    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    fireEvent.change(passwordInput, { target: { value: '123' } }); // Short password
    fireEvent.click(signupButton);
    
    await waitFor(() => {
      expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
    });
  });

  test('shows loading state during login', async () => {
    const { post } = require('../services/api');
    post.mockImplementation(() => new Promise(resolve => 
      setTimeout(() => resolve({ data: { success: true } }), 100)
    ));
    
    render(<LoginSignUp />);
    
    const emailInput = screen.getByPlaceholderText('Email');
    const passwordInput = screen.getByPlaceholderText('Password');
    const loginButton = screen.getByRole('button', { name: /login/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(loginButton);
    
    expect(screen.getByText('Logging in...')).toBeInTheDocument();
  });

  test('shows loading state during signup', async () => {
    const { post } = require('../services/api');
    post.mockImplementation(() => new Promise(resolve => 
      setTimeout(() => resolve({ data: { success: true } }), 100)
    ));
    
    render(<LoginSignUp />);
    
    // Switch to signup
    const signupTab = screen.getByText('Sign Up');
    fireEvent.click(signupTab);
    
    const nameInput = screen.getByPlaceholderText('Full Name');
    const emailInput = screen.getByPlaceholderText('Email');
    const passwordInput = screen.getByPlaceholderText('Password');
    const signupButton = screen.getByRole('button', { name: /sign up/i });
    
    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(signupButton);
    
    expect(screen.getByText('Creating account...')).toBeInTheDocument();
  });
});
