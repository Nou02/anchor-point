#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('⚓ Anchor Point Application Setup');
console.log('=====================================\n');

// Check if Node.js is installed
try {
  const nodeVersion = execSync('node --version', { encoding: 'utf8' });
  console.log(`✅ Node.js version: ${nodeVersion.trim()}`);
} catch (error) {
  console.error('❌ Node.js is not installed. Please install Node.js first.');
  process.exit(1);
}

// Check if npm is installed
try {
  const npmVersion = execSync('npm --version', { encoding: 'utf8' });
  console.log(`✅ npm version: ${npmVersion.trim()}`);
} catch (error) {
  console.error('❌ npm is not installed. Please install npm first.');
  process.exit(1);
}

// Install frontend dependencies
console.log('\n📦 Installing frontend dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Frontend dependencies installed successfully');
} catch (error) {
  console.error('❌ Failed to install frontend dependencies');
  process.exit(1);
}

// Check if Python is installed
try {
  const pythonVersion = execSync('python --version', { encoding: 'utf8' });
  console.log(`✅ Python version: ${pythonVersion.trim()}`);
} catch (error) {
  try {
    const python3Version = execSync('python3 --version', { encoding: 'utf8' });
    console.log(`✅ Python3 version: ${python3Version.trim()}`);
  } catch (error2) {
    console.error('❌ Python is not installed. Please install Python first.');
    process.exit(1);
  }
}

// Check if backend directory exists
const backendPath = path.join(__dirname, 'backend');
if (!fs.existsSync(backendPath)) {
  console.error('❌ Backend directory not found');
  process.exit(1);
}

// Install backend dependencies
console.log('\n🐍 Installing backend dependencies...');
try {
  execSync('pip install -r requirements.txt', { 
    cwd: backendPath, 
    stdio: 'inherit' 
  });
  console.log('✅ Backend dependencies installed successfully');
} catch (error) {
  console.error('❌ Failed to install backend dependencies');
  console.log('💡 Try creating a virtual environment first:');
  console.log('   cd backend');
  console.log('   python -m venv venv');
  console.log('   source venv/bin/activate  # On Windows: venv\\Scripts\\activate');
  console.log('   pip install -r requirements.txt');
}

console.log('\n🎉 Setup completed successfully!');
console.log('\n📋 Next steps:');
console.log('1. Configure Firebase:');
console.log('   - Go to https://console.firebase.google.com/');
console.log('   - Create a new project or select existing one');
console.log('   - Enable Authentication and Firestore Database');
console.log('   - Download service account key and save as backend/serviceAccountKey.json');
console.log('\n2. Update Firebase configuration:');
console.log('   - Open src/firebase/config.js');
console.log('   - Replace placeholder values with your Firebase credentials');
console.log('\n3. Start the development servers:');
console.log('   - Frontend: npm start (runs on http://localhost:3000)');
console.log('   - Backend: cd backend && python app.py (runs on http://localhost:5000)');
console.log('\n�� Happy coding!'); 