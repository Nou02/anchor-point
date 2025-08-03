from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Mock user data for demo purposes
mock_users = {
    "demo@example.com": {
        "uid": "demo123",
        "email": "demo@example.com",
        "display_name": "Demo User",
        "role": "user"
    }
}

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "message": "AnchorPoint API is running"})

@app.route('/api/login', methods=['POST'])
def login():
    """Handle user login (mock version)"""
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400
        
        # Mock authentication - accept any email/password for demo
        if email in mock_users:
            user = mock_users[email]
        else:
            # Create a new mock user
            user = {
                "uid": f"user_{len(mock_users) + 1}",
                "email": email,
                "display_name": email.split('@')[0],
                "role": "user"
            }
            mock_users[email] = user
        
        return jsonify({
            "success": True,
            "user": user
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/register', methods=['POST'])
def register():
    """Handle user registration (mock version)"""
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        display_name = data.get('display_name', email.split('@')[0] if email else 'User')
        
        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400
        
        # Create mock user
        user = {
            "uid": f"user_{len(mock_users) + 1}",
            "email": email,
            "display_name": display_name,
            "role": "user"
        }
        
        mock_users[email] = user
        
        return jsonify({
            "success": True,
            "user": user
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/users/<user_id>', methods=['GET'])
def get_user(user_id):
    """Get user profile (mock version)"""
    try:
        # Find user by email or uid
        user = None
        for email, user_data in mock_users.items():
            if user_data['uid'] == user_id or email == user_id:
                user = user_data
                break
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        return jsonify({
            "success": True,
            "user": user
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/users/<user_id>', methods=['PUT'])
def update_user(user_id):
    """Update user profile (mock version)"""
    try:
        data = request.get_json()
        
        # Find user by email or uid
        user = None
        user_email = None
        for email, user_data in mock_users.items():
            if user_data['uid'] == user_id or email == user_id:
                user = user_data
                user_email = email
                break
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Update user data
        if 'display_name' in data:
            user['display_name'] = data['display_name']
        if 'role' in data:
            user['role'] = data['role']
        
        mock_users[user_email] = user
        
        return jsonify({
            "success": True,
            "user": user
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/ships', methods=['GET'])
def get_ships():
    """Get ship schedules (mock data)"""
    mock_ships = [
        {
            "id": "ship001",
            "name": "TASMANIAN WINTER",
            "status": "docked",
            "arrival": "2024-01-15T08:00:00Z",
            "departure": "2024-01-17T16:00:00Z",
            "dock": "Pier 3"
        },
        {
            "id": "ship002", 
            "name": "PACIFIC STAR",
            "status": "in_transit",
            "arrival": "2024-01-18T10:00:00Z",
            "departure": "2024-01-20T14:00:00Z",
            "dock": "Pier 1"
        },
        {
            "id": "ship003",
            "name": "ATLANTIC VOYAGER", 
            "status": "scheduled",
            "arrival": "2024-01-22T06:00:00Z",
            "departure": "2024-01-24T18:00:00Z",
            "dock": "Pier 2"
        }
    ]
    
    return jsonify({
        "success": True,
        "ships": mock_ships
    })

@app.route('/api/crew', methods=['GET'])
def get_crew():
    """Get crew assignments (mock data)"""
    mock_crew = [
        {
            "id": "crew001",
            "name": "Captain Sarah Johnson",
            "position": "Captain",
            "ship_id": "ship001",
            "status": "on_duty"
        },
        {
            "id": "crew002",
            "name": "First Mate Michael Chen",
            "position": "First Mate", 
            "ship_id": "ship001",
            "status": "on_duty"
        },
        {
            "id": "crew003",
            "name": "Engineer David Rodriguez",
            "position": "Chief Engineer",
            "ship_id": "ship002",
            "status": "off_duty"
        }
    ]
    
    return jsonify({
        "success": True,
        "crew": mock_crew
    })

if __name__ == '__main__':
    print("🚢 AnchorPoint API Server Starting...")
    print("📍 Health Check: http://localhost:5000/api/health")
    print("📋 Available Endpoints:")
    print("   - GET  /api/health")
    print("   - POST /api/login")
    print("   - POST /api/register") 
    print("   - GET  /api/users/<user_id>")
    print("   - PUT  /api/users/<user_id>")
    print("   - GET  /api/ships")
    print("   - GET  /api/crew")
    print("\n🌐 Server will be available at: http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000) 