# AnchorPoint - Maritime Management System

A modern maritime management application featuring a beautiful homepage with a shipping/port theme, built with React.js frontend, Flask backend, and Firebase integration.

## Features

- **Beautiful Landing Page**: Dark maritime theme with centered branding and click-to-enter functionality
- **Interactive Homepage**: Recreates the provided image with a maritime theme and port background
- **Functional Calendar**: Interactive scheduling calendar with month navigation and date selection
- **Modern UI/UX**: Responsive design with smooth animations and transitions
- **Navigation Menu**: Sidebar navigation with Home, Scheduling, Reports, Payroll, and Weather options
- **Firebase Authentication**: Secure user authentication and management
- **Flask Backend API**: RESTful API for user management and authentication
- **Dashboard**: Post-login dashboard with shipping management features
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices

## Tech Stack

### Frontend
- **React.js 18**: Modern React with hooks and functional components
- **Firebase**: Authentication and real-time database
- **CSS3**: Custom styling with animations and responsive design
- **Axios**: HTTP client for API communication

### Backend
- **Flask**: Python web framework for API development
- **Firebase Admin SDK**: Server-side Firebase integration
- **Flask-CORS**: Cross-origin resource sharing support

### Database
- **Firebase Firestore**: NoSQL cloud database
- **Firebase Authentication**: User authentication service

## Project Structure

```
Final Project/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── LandingPage.js
│   │   ├── LandingPage.css
│   │   ├── Homepage.js
│   │   ├── Homepage.css
│   │   ├── Scheduling.js
│   │   ├── Scheduling.css
│   │   ├── LoginScreen.js
│   │   ├── LoginScreen.css
│   │   ├── Dashboard.js
│   │   └── Dashboard.css
│   ├── services/
│   │   └── api.js
│   ├── firebase/
│   │   └── config.js
│   ├── App.js
│   ├── App.css
│   ├── index.js
│   └── index.css
├── backend/
│   ├── app.py
│   ├── config.py
│   └── requirements.txt
├── package.json
└── README.md
```

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- Python (v3.8 or higher)
- Firebase project account

### 1. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select an existing one
3. Enable Authentication and Firestore Database
4. Download your service account key:
   - Go to Project Settings > Service Accounts
   - Click "Generate new private key"
   - Save the JSON file as `serviceAccountKey.json` in the `backend/` folder

### 2. Frontend Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure Firebase:
   - Open `src/firebase/config.js`
   - Replace the placeholder values with your Firebase project credentials:
   ```javascript
   const firebaseConfig = {
     apiKey: "your-api-key",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "your-messaging-sender-id",
     appId: "your-app-id"
   };
   ```

3. Start the development server:
   ```bash
   npm start
   ```

The frontend will be available at `http://localhost:3000`

### 3. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment (recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure Firebase credentials:
   - Place your `serviceAccountKey.json` file in the `backend/` folder
   - Update the path in `app.py`:
   ```python
   cred = credentials.Certificate("serviceAccountKey.json")
   ```

5. Start the Flask server:
   ```bash
   python app.py
   ```

The backend API will be available at `http://localhost:5000`

### 4. Environment Variables (Optional)

Create a `.env` file in the backend directory for additional configuration:

```env
SECRET_KEY=your-secret-key
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_CLIENT_X509_CERT_URL=your-cert-url
```

## Usage

1. **Landing Page**: The application starts with a beautiful landing page featuring the AnchorPoint branding
2. **Click to Enter**: Users can click anywhere on the landing page to enter the main application
3. **Homepage**: After clicking, users see the interactive homepage with maritime management interface
4. **Navigation**: Users can navigate between Home, Scheduling, Reports, Payroll, and Weather sections
5. **Scheduling**: Click on "Scheduling" to access the interactive calendar with month navigation
6. **Calendar Features**: Navigate between months using arrow buttons, select dates, and view appointments
7. **Authentication**: Users can log in with their credentials (Firebase authentication)
8. **Dashboard**: After successful login, users are redirected to a comprehensive dashboard
9. **Features**: The dashboard includes shipment tracking, order management, analytics, and settings

## API Endpoints

### Authentication
- `POST /api/login` - User login
- `POST /api/register` - User registration

### User Management
- `GET /api/users/<user_id>` - Get user profile
- `PUT /api/users/<user_id>` - Update user profile

### Health Check
- `GET /api/health` - API health check

## Customization

### Styling
- Modify `src/components/Homepage.css` to change the homepage appearance
- Update `src/components/LoginScreen.css` to change the login screen appearance
- Update `src/components/Dashboard.css` for dashboard styling
- The color scheme uses `#2F3B70` as the primary blue color for the sidebar

### Background
- The background uses CSS gradients to simulate the port/harbor scene
- You can replace the gradient with an actual image by modifying the `.background-image` class

### Firebase Configuration
- Update Firebase rules in the Firebase Console for security
- Configure authentication providers as needed
- Set up Firestore security rules

## Deployment

### Frontend (React)
```bash
npm run build
```
Deploy the `build/` folder to your hosting service (Netlify, Vercel, etc.)

### Backend (Flask)
Deploy to platforms like:
- Heroku
- Google Cloud Platform
- AWS
- DigitalOcean

Remember to:
- Set environment variables
- Configure CORS for your production domain
- Update Firebase security rules

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

For support and questions, please open an issue in the repository. 