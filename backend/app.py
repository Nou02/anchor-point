from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from datetime import datetime
from openpyxl import load_workbook

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

# ========================
# Excel utilities & routes
# ========================
EXCEL_DIR = os.path.join(os.path.dirname(__file__), 'uploads')
EXCEL_FILENAME = 'Vessels Log.xlsx'
EXCEL_PATH = os.path.join(EXCEL_DIR, EXCEL_FILENAME)

# Also save to public folder for Analytics access
PUBLIC_EXCEL_PATH = os.path.join(os.path.dirname(__file__), '..', 'public', EXCEL_FILENAME)

def _load_workbook_or_404(path):
    if not os.path.exists(path):
        raise FileNotFoundError(f"Excel file not found at {path}")
    return load_workbook(filename=path)

@app.route('/api/excel/read', methods=['GET'])
def read_excel_as_json():
    """Read first worksheet into JSON rows using header row."""
    try:
        wb = _load_workbook_or_404(EXCEL_PATH)
        ws = wb.active

        rows = list(ws.iter_rows(values_only=True))
        if not rows:
            return jsonify({"success": True, "headers": [], "rows": []})

        headers = [str(h).strip() if h is not None else '' for h in rows[0]]
        data_rows = []
        for row in rows[1:]:
            obj = {}
            for i, value in enumerate(row):
                key = headers[i] if i < len(headers) else f"col_{i+1}"
                obj[key] = value
            data_rows.append(obj)

        return jsonify({"success": True, "headers": headers, "rows": data_rows})
    except FileNotFoundError as e:
        return jsonify({"success": False, "error": str(e)}), 404
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/excel/append', methods=['POST'])
def append_excel_row():
    """Append a row to the first worksheet.
    Accepts either {"row": [...]} or {"object": {header: value}}.
    """
    try:
        payload = request.get_json(silent=True) or {}
        if not payload:
            return jsonify({"success": False, "error": "Missing JSON body"}), 400

        wb = _load_workbook_or_404(EXCEL_PATH)
        ws = wb.active

        headers = []
        if ws.max_row >= 1:
            headers = [str(c.value).strip() if c.value is not None else '' for c in ws[1]]

        if 'row' in payload and isinstance(payload['row'], list):
            values = payload['row']
        elif 'object' in payload and isinstance(payload['object'], dict) and headers:
            values = [payload['object'].get(h, None) for h in headers]
        else:
            return jsonify({"success": False, "error": "Provide 'row' array or 'object' matching headers"}), 400

        ws.append(values)
        wb.save(EXCEL_PATH)
        wb.save(PUBLIC_EXCEL_PATH)

        return jsonify({"success": True, "appended": values, "totalRows": ws.max_row})
    except FileNotFoundError as e:
        return jsonify({"success": False, "error": str(e)}), 404
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/excel/save-report', methods=['POST'])
def save_report_to_excel():
    """Save report data to the correct year sheet based on the date.
    Expects: {
        "date": "2024-01-15",
        "vesselName": "VESSEL NAME",
        "voyageNo": "VOYAGE123",
        "purposeOfCall": "W/MOORING BUOY",
        "controlId": "CTRL001"
    }
    """
    try:
        payload = request.get_json(silent=True) or {}
        if not payload:
            return jsonify({"success": False, "error": "Missing JSON body"}), 400

        # Extract data from payload
        date_str = payload.get('date')
        vessel_name = payload.get('vesselName', '')
        voyage_no = payload.get('voyageNo', '')
        purpose_of_call = payload.get('purposeOfCall', '')
        control_id = payload.get('controlId', '')

        if not date_str:
            return jsonify({"success": False, "error": "Date is required"}), 400

        # Determine the year and sheet name
        try:
            date_obj = datetime.strptime(date_str, '%Y-%m-%d')
            year = date_obj.year
            sheet_name = str(year)
        except ValueError:
            return jsonify({"success": False, "error": "Invalid date format. Use YYYY-MM-DD"}), 400

        # Load workbook
        wb = _load_workbook_or_404(EXCEL_PATH)
        
        # Check if sheet exists, if not create it
        if sheet_name not in wb.sheetnames:
            ws = wb.create_sheet(sheet_name)
            # Add headers based on year
            if year == 2023:
                headers = ['No.', 'Vessel', 'Service', 'Control Number', 'Voyage Number', 'Date']
            elif year == 2024:
                headers = ['No.', 'Vessel', 'Service', 'Control Number', 'Voyage Number', 'Date']
            else:  # 2025 and future years
                headers = ['No.', 'Vessel', 'Service', 'Control Number', 'Voyage Number', 'Date']
            
            ws.append(headers)
        else:
            ws = wb[sheet_name]

        # Get the next row number (No. column)
        next_row = ws.max_row + 1
        row_number = next_row - 1  # Subtract 1 because header row is row 1

        # Prepare the row data based on year structure
        if year == 2023:
            # 2023 structure: No., Vessel, Service (control numbers), ID, Date
            row_data = [
                row_number,
                vessel_name,
                purpose_of_call,  # Service column
                control_id,       # Control Number column
                voyage_no,        # Voyage Number column
                date_str          # Date column
            ]
        elif year == 2024:
            # 2024 structure: No., Vessel, Service (empty), Control Number, Voyage Number, Date
            row_data = [
                row_number,
                vessel_name,
                purpose_of_call,  # Service column
                control_id,       # Control Number column
                voyage_no,        # Voyage Number column
                date_str          # Date column
            ]
        else:
            # 2025+ structure: No., Vessel, Service, Control Number, Voyage Number, Date
            row_data = [
                row_number,
                vessel_name,
                purpose_of_call,  # Service column
                control_id,       # Control Number column
                voyage_no,        # Voyage Number column
                date_str          # Date column
            ]

        # Append the row
        ws.append(row_data)
        
        # Save the workbook to both locations
        wb.save(EXCEL_PATH)
        wb.save(PUBLIC_EXCEL_PATH)

        return jsonify({
            "success": True, 
            "message": f"Report saved to {sheet_name} sheet in both backend and public folders",
            "sheet": sheet_name,
            "rowNumber": row_number,
            "data": {
                "vesselName": vessel_name,
                "voyageNo": voyage_no,
                "purposeOfCall": purpose_of_call,
                "controlId": control_id,
                "date": date_str
            }
        })

    except FileNotFoundError as e:
        return jsonify({"success": False, "error": str(e)}), 404
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/excel/delete-report', methods=['DELETE'])
def delete_report_from_excel():
    """Delete report data from Excel file by date.
    Expects: {
        "date": "2024-01-15"
    }
    """
    try:
        payload = request.get_json(silent=True) or {}
        if not payload:
            return jsonify({"success": False, "error": "Missing JSON body"}), 400

        # Extract date from payload
        date_str = payload.get('date')
        if not date_str:
            return jsonify({"success": False, "error": "Date is required"}), 400

        # Determine the year and sheet name
        try:
            date_obj = datetime.strptime(date_str, '%Y-%m-%d')
            year = date_obj.year
            sheet_name = str(year)
        except ValueError:
            return jsonify({"success": False, "error": "Invalid date format. Use YYYY-MM-DD"}), 400

        # Load workbook
        wb = _load_workbook_or_404(EXCEL_PATH)
        
        # Check if sheet exists
        if sheet_name not in wb.sheetnames:
            return jsonify({"success": False, "error": f"Sheet {sheet_name} not found"}), 404

        ws = wb[sheet_name]
        deleted_rows = []

        # Find and delete rows matching the date
        # Start from the end to avoid index shifting issues
        for row_idx in range(ws.max_row, 1, -1):
            # Check if this row contains the target date
            date_cell = None
            if year == 2023:
                date_cell = ws.cell(row=row_idx, column=5)  # Date column for 2023
            elif year == 2024:
                date_cell = ws.cell(row=row_idx, column=6)  # Date column for 2024
            else:  # 2025+
                date_cell = ws.cell(row=row_idx, column=6)  # Date column for 2025+

            if date_cell and date_cell.value:
                # Convert cell value to string and compare
                cell_date_str = str(date_cell.value).strip()
                if cell_date_str == date_str or cell_date_str == date_obj.strftime('%Y-%m-%d'):
                    # Delete this row
                    ws.delete_rows(row_idx)
                    deleted_rows.append(row_idx)
                    print(f"Deleted row {row_idx} from sheet {sheet_name}")

        if not deleted_rows:
            return jsonify({
                "success": True, 
                "message": f"No data found for date {date_str} in sheet {sheet_name}",
                "deletedRows": 0
            })

        # Save the workbook to both locations
        wb.save(EXCEL_PATH)
        wb.save(PUBLIC_EXCEL_PATH)

        return jsonify({
            "success": True, 
            "message": f"Deleted {len(deleted_rows)} row(s) from {sheet_name} sheet",
            "sheet": sheet_name,
            "deletedRows": len(deleted_rows),
            "deletedRowNumbers": deleted_rows
        })

    except FileNotFoundError as e:
        return jsonify({"success": False, "error": str(e)}), 404
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

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