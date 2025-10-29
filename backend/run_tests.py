#!/usr/bin/env python3
"""
Test runner script for AnchorPoint backend tests.
This script runs all tests and generates coverage reports.
"""

import subprocess
import sys
import os

def run_tests():
    """Run all backend tests with coverage reporting."""
    print("🚀 Starting AnchorPoint Backend Tests...")
    print("=" * 50)
    
    # Change to backend directory
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(backend_dir)
    
    try:
        # Install test dependencies
        print("📦 Installing test dependencies...")
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"], 
                      check=True, capture_output=True)
        
        # Run tests with coverage
        print("\n🧪 Running tests with coverage...")
        result = subprocess.run([
            sys.executable, "-m", "pytest", 
            "test_app.py", 
            "-v", 
            "--cov=app", 
            "--cov-report=html", 
            "--cov-report=term-missing",
            "--tb=short"
        ], capture_output=True, text=True)
        
        # Print test results
        print("Test Output:")
        print(result.stdout)
        
        if result.stderr:
            print("Test Errors:")
            print(result.stderr)
        
        # Check if tests passed
        if result.returncode == 0:
            print("\n✅ All tests passed successfully!")
            print(f"📊 Coverage report generated in: {backend_dir}/htmlcov/index.html")
        else:
            print("\n❌ Some tests failed!")
            return False
            
    except subprocess.CalledProcessError as e:
        print(f"❌ Error running tests: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False
    
    return True

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
