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
EXCEL_FILENAME = 'Vessels Log.xlsx'
# Use only the public folder for Excel file access
EXCEL_PATH = os.path.join(os.path.dirname(__file__), '..', 'public', EXCEL_FILENAME)

def _load_workbook_or_404(path):
    print(f"Checking Excel file at: {path}")
    print(f"File exists: {os.path.exists(path)}")
    if not os.path.exists(path):
        raise FileNotFoundError(f"Excel file not found at {path}")
    try:
        wb = load_workbook(filename=path)
        print(f"Successfully loaded workbook with sheets: {wb.sheetnames}")
        return wb
    except Exception as e:
        print(f"Error loading workbook: {e}")
        raise

@app.route('/api/excel/debug', methods=['GET'])
def debug_excel_file():
    """Debug endpoint to check Excel file status."""
    try:
        file_info = {
            "excel_path": EXCEL_PATH,
            "file_exists": os.path.exists(EXCEL_PATH),
            "file_size": os.path.getsize(EXCEL_PATH) if os.path.exists(EXCEL_PATH) else 0,
            "current_directory": os.getcwd(),
            "backend_directory": os.path.dirname(__file__)
        }
        
        if os.path.exists(EXCEL_PATH):
            try:
                wb = load_workbook(filename=EXCEL_PATH)
                file_info.update({
                    "sheets": wb.sheetnames,
                    "active_sheet": wb.active.title,
                    "max_row": wb.active.max_row,
                    "max_column": wb.active.max_column
                })
                
                # Get headers if they exist
                if wb.active.max_row >= 1:
                    headers = [str(c.value).strip() if c.value is not None else '' for c in wb.active[1]]
                    file_info["headers"] = headers
            except Exception as e:
                file_info["load_error"] = str(e)
        
        return jsonify({"success": True, "file_info": file_info})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

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
        print(f"Excel append request payload: {payload}")
        
        if not payload:
            return jsonify({"success": False, "error": "Missing JSON body"}), 400

        print(f"Loading workbook from: {EXCEL_PATH}")
        wb = _load_workbook_or_404(EXCEL_PATH)
        ws = wb.active
        print(f"Active worksheet: {ws.title}")
        print(f"Worksheet max row: {ws.max_row}")

        headers = []
        if ws.max_row >= 1:
            headers = [str(c.value).strip() if c.value is not None else '' for c in ws[1]]
            print(f"Headers found: {headers}")

        if 'row' in payload and isinstance(payload['row'], list):
            values = payload['row']
            print(f"Using row format: {values}")
        elif 'object' in payload and isinstance(payload['object'], dict):
            if not headers:
                print("No headers found, creating default headers")
                # Create default headers if none exist
                headers = ['Vessel', 'Voyage Number', 'Control Number', 'Service', 'Date', 'Time', 'Vessel Type']
                # Add headers to first row if worksheet is empty
                if ws.max_row == 0:
                    ws.append(headers)
                    print(f"Added default headers: {headers}")
            
            values = [payload['object'].get(h, None) for h in headers]
            print(f"Using object format with headers {headers}: {values}")
        else:
            error_msg = f"Invalid payload format. Expected 'row' array or 'object' dict. Got: {type(payload)}"
            print(error_msg)
            return jsonify({"success": False, "error": error_msg}), 400

        print(f"Appending values: {values}")
        ws.append(values)
        
        print(f"Saving workbook to: {EXCEL_PATH}")
        wb.save(EXCEL_PATH)
        print(f"Successfully saved. New max row: {ws.max_row}")

        return jsonify({"success": True, "appended": values, "totalRows": ws.max_row})
    except FileNotFoundError as e:
        error_msg = f"Excel file not found at {EXCEL_PATH}: {str(e)}"
        print(error_msg)
        return jsonify({"success": False, "error": error_msg}), 404
    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        print(error_msg)
        print(f"Error type: {type(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({"success": False, "error": error_msg}), 500

@app.route('/api/excel/update-entry', methods=['PUT'])
def update_excel_entry():
    """Update an existing Excel entry by date and vessel name.
    Expects: {
        "date": "2024-10-29",
        "vesselName": "OLD VESSEL NAME",
        "newData": {
            "Vessel": "NEW VESSEL NAME",
            "Voyage Number": "NEW123",
            "Control Number": "NEW-CTRL",
            "Service": "NEW SERVICE",
            "Date": "2024-10-29",
            "Time": "2:00 PM",
            "Vessel Type": "Foreign"
        }
    }
    """
    try:
        payload = request.get_json(silent=True) or {}
        print(f"Update entry request payload: {payload}")
        
        if not payload:
            return jsonify({"success": False, "error": "Missing JSON body"}), 400

        date_str = payload.get('date')
        vessel_name = payload.get('vesselName')
        new_data = payload.get('newData')
        
        if not date_str or not vessel_name or not new_data:
            return jsonify({"success": False, "error": "Missing required fields: date, vesselName, newData"}), 400

        # Parse the date
        try:
            date_obj = datetime.strptime(date_str, '%Y-%m-%d')
            year = date_obj.year
            sheet_name = str(year)
        except ValueError:
            return jsonify({"success": False, "error": "Invalid date format. Use YYYY-MM-DD"}), 400

        print(f"Loading workbook for update...")
        wb = _load_workbook_or_404(EXCEL_PATH)
        
        if sheet_name not in wb.sheetnames:
            return jsonify({"success": False, "error": f"Sheet {sheet_name} not found"}), 404

        ws = wb[sheet_name]
        updated_rows = []

        # Find and update rows matching the date and vessel name
        for row_idx in range(2, ws.max_row + 1):  # Start from row 2 (skip header)
            # Check date column
            date_cell = None
            vessel_cell = None
            
            if year == 2023:
                date_cell = ws.cell(row=row_idx, column=6)  # Date column for 2023
                vessel_cell = ws.cell(row=row_idx, column=2)  # Vessel column for 2023
            elif year == 2024:
                date_cell = ws.cell(row=row_idx, column=6)  # Date column for 2024
                vessel_cell = ws.cell(row=row_idx, column=2)  # Vessel column for 2024
            else:  # 2025+
                date_cell = ws.cell(row=row_idx, column=6)  # Date column for 2025+
                vessel_cell = ws.cell(row=row_idx, column=2)  # Vessel column for 2025+

            if date_cell and vessel_cell and date_cell.value and vessel_cell.value:
                # Check if this row matches our criteria
                cell_date_str = str(date_cell.value).strip()
                cell_vessel_str = str(vessel_cell.value).strip()
                
                # Parse and compare dates
                cell_date_obj = None
                for fmt in ['%Y-%m-%d', '%m/%d/%Y', '%d/%m/%Y', '%Y-%m-%d %H:%M:%S']:
                    try:
                        cell_date_obj = datetime.strptime(cell_date_str, fmt)
                        break
                    except ValueError:
                        continue
                
                if (cell_date_obj and cell_date_obj.date() == date_obj.date() and 
                    cell_vessel_str == vessel_name):
                    
                    print(f"Found matching row {row_idx}: {cell_vessel_str} on {cell_date_str}")
                    
                    # Update the row with new data
                    headers = [str(c.value).strip() if c.value is not None else '' for c in ws[1]]
                    
                    for col_idx, header in enumerate(headers, 1):
                        if header in new_data:
                            ws.cell(row=row_idx, column=col_idx).value = new_data[header]
                            print(f"Updated {header} to {new_data[header]}")
                    
                    updated_rows.append(row_idx)
                    break  # Only update the first match

        if not updated_rows:
            return jsonify({
                "success": False, 
                "message": f"No entry found for vessel '{vessel_name}' on date {date_str}",
                "updatedRows": 0
            })

        # Save the workbook
        wb.save(EXCEL_PATH)
        print(f"Successfully updated {len(updated_rows)} row(s)")

        return jsonify({
            "success": True, 
            "message": f"Updated {len(updated_rows)} row(s) in {sheet_name} sheet",
            "sheet": sheet_name,
            "updatedRows": len(updated_rows),
            "updatedRowNumbers": updated_rows
        })

    except FileNotFoundError as e:
        return jsonify({"success": False, "error": str(e)}), 404
    except Exception as e:
        print(f"Error updating Excel entry: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
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
        vessel_type = payload.get('vesselType', 'Local')
        time = payload.get('time', '')

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
                headers = ['No.', 'Vessel', 'Service', 'Control Number', 'Voyage Number', 'Date', 'Time', 'Vessel Type']
            elif year == 2024:
                headers = ['No.', 'Vessel', 'Service', 'Control Number', 'Voyage Number', 'Date', 'Time', 'Vessel Type']
            else:  # 2025 and future years
                headers = ['No.', 'Vessel', 'Service', 'Control Number', 'Voyage Number', 'Date', 'Time', 'Vessel Type']
            
            ws.append(headers)
        else:
            ws = wb[sheet_name]

        # Get the next row number (No. column)
        next_row = ws.max_row + 1
        row_number = next_row - 1  # Subtract 1 because header row is row 1

        # Prepare the row data based on year structure
        if year == 2023:
            # 2023 structure: No., Vessel, Service (control numbers), ID, Date, Time, Vessel Type
            row_data = [
                row_number,
                vessel_name,
                purpose_of_call,  # Service column
                control_id,       # Control Number column
                voyage_no,        # Voyage Number column
                date_str,         # Date column
                time,             # Time column
                vessel_type       # Vessel Type column
            ]
        elif year == 2024:
            # 2024 structure: No., Vessel, Service, Control Number, Voyage Number, Date, Time, Vessel Type
            row_data = [
                row_number,
                vessel_name,
                purpose_of_call,  # Service column
                control_id,       # Control Number column
                voyage_no,        # Voyage Number column
                date_str,         # Date column
                time,             # Time column
                vessel_type       # Vessel Type column
            ]
        else:
            # 2025+ structure: No., Vessel, Service, Control Number, Voyage Number, Date, Time, Vessel Type
            row_data = [
                row_number,
                vessel_name,
                purpose_of_call,  # Service column
                control_id,       # Control Number column
                voyage_no,        # Voyage Number column
                date_str,         # Date column
                time,             # Time column
                vessel_type       # Vessel Type column
            ]

        # Append the row
        ws.append(row_data)
        
        # Save the workbook to public location
        wb.save(EXCEL_PATH)

        return jsonify({
            "success": True, 
            "message": f"Report saved to {sheet_name} sheet in public folder",
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
    """Delete report data from Excel file by date and vessel name.
    Expects: {
        "date": "2024-01-15",
        "vesselName": "VESSEL NAME" (optional)
    }
    """
    try:
        payload = request.get_json(silent=True) or {}
        if not payload:
            return jsonify({"success": False, "error": "Missing JSON body"}), 400

        # Extract date and vessel name from payload
        date_str = payload.get('date')
        vessel_name = payload.get('vesselName')
        if not date_str:
            return jsonify({"success": False, "error": "Date is required"}), 400

        # Try to parse the date in multiple formats
        date_obj = None
        date_formats = [
            '%Y-%m-%d',      # 2024-10-29
            '%m/%d/%Y',      # 10/29/2024
            '%d/%m/%Y',      # 29/10/2024
            '%Y-%m-%d %H:%M:%S',  # 2024-10-29 00:00:00
        ]
        
        for fmt in date_formats:
            try:
                date_obj = datetime.strptime(date_str, fmt)
                break
            except ValueError:
                continue
        
        if not date_obj:
            return jsonify({"success": False, "error": f"Invalid date format: {date_str}. Supported formats: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY"}), 400

        year = date_obj.year
        sheet_name = str(year)

        # Load workbook
        wb = _load_workbook_or_404(EXCEL_PATH)
        
        # Check if sheet exists
        if sheet_name not in wb.sheetnames:
            return jsonify({"success": False, "error": f"Sheet {sheet_name} not found"}), 404

        ws = wb[sheet_name]
        deleted_rows = []

        # Find and delete rows matching the date (and vessel name if provided)
        # Start from the end to avoid index shifting issues
        for row_idx in range(ws.max_row, 1, -1):
            # Check if this row contains the target date
            date_cell = None
            vessel_cell = None
            
            if year == 2023:
                date_cell = ws.cell(row=row_idx, column=5)  # Date column for 2023
                vessel_cell = ws.cell(row=row_idx, column=2)  # Vessel column for 2023
            elif year == 2024:
                date_cell = ws.cell(row=row_idx, column=6)  # Date column for 2024
                vessel_cell = ws.cell(row=row_idx, column=2)  # Vessel column for 2024
            else:  # 2025+
                date_cell = ws.cell(row=row_idx, column=6)  # Date column for 2025+
                vessel_cell = ws.cell(row=row_idx, column=2)  # Vessel column for 2025+

            if date_cell and date_cell.value:
                # Convert cell value to string and compare
                cell_date_str = str(date_cell.value).strip()
                cell_vessel_str = str(vessel_cell.value).strip() if vessel_cell and vessel_cell.value else ''
                
                # Try to parse the cell date and compare with target date
                cell_date_obj = None
                cell_date_formats = [
                    '%Y-%m-%d',      # 2024-10-29
                    '%m/%d/%Y',      # 10/29/2024
                    '%d/%m/%Y',      # 29/10/2024
                    '%Y-%m-%d %H:%M:%S',  # 2024-10-29 00:00:00
                    '%Y-%m-%d %H:%M:%S.%f',  # 2024-10-29 00:00:00.000000
                ]
                
                for fmt in cell_date_formats:
                    try:
                        cell_date_obj = datetime.strptime(cell_date_str, fmt)
                        break
                    except ValueError:
                        continue
                
                # Check if date matches
                date_matches = cell_date_obj and cell_date_obj.date() == date_obj.date()
                
                # Check if vessel name matches (if provided)
                vessel_matches = True
                if vessel_name:
                    vessel_matches = cell_vessel_str == vessel_name
                
                # Delete this row if both date and vessel name match
                if date_matches and vessel_matches:
                    ws.delete_rows(row_idx)
                    deleted_rows.append(row_idx)
                    print(f"Deleted row {row_idx} from sheet {sheet_name} (matched date: {cell_date_str}, vessel: {cell_vessel_str})")

        if not deleted_rows:
            message = f"No data found for date {date_str} in sheet {sheet_name}"
            if vessel_name:
                message += f" with vessel name '{vessel_name}'"
            return jsonify({
                "success": True, 
                "message": message,
                "deletedRows": 0
            })

        # Save the workbook to public location
        wb.save(EXCEL_PATH)

        message = f"Deleted {len(deleted_rows)} row(s) from {sheet_name} sheet"
        if vessel_name:
            message += f" for vessel '{vessel_name}'"
        
        return jsonify({
            "success": True, 
            "message": message,
            "sheet": sheet_name,
            "deletedRows": len(deleted_rows),
            "deletedRowNumbers": deleted_rows
        })

    except FileNotFoundError as e:
        return jsonify({"success": False, "error": str(e)}), 404
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/excel/vessels-log', methods=['GET'])
def get_vessels_log_data():
    """Get all vessel log data from Excel file for reports display.
    Returns data from all sheets in a format suitable for the reports table.
    """
    try:
        wb = _load_workbook_or_404(EXCEL_PATH)
        all_vessels_data = []
        
        # Process each sheet (year)
        for sheet_name in wb.sheetnames:
            if sheet_name.isdigit():  # Only process year sheets
                ws = wb[sheet_name]
                year = int(sheet_name)
                
                # Get headers from first row
                headers = []
                if ws.max_row >= 1:
                    headers = [str(c.value).strip() if c.value is not None else '' for c in ws[1]]
                
                # Process data rows
                for row_idx in range(2, ws.max_row + 1):  # Skip header row
                    row_data = {}
                    for col_idx, header in enumerate(headers, 1):
                        cell_value = ws.cell(row=row_idx, column=col_idx).value
                        row_data[header] = str(cell_value).strip() if cell_value is not None else ''
                    
                    # Only add rows that have meaningful data
                    if any(value for value in row_data.values() if value and value != 'None'):
                        # Standardize the data structure for the reports table
                        vessel_entry = {
                            'date': row_data.get('Date', ''),
                            'vessel': row_data.get('Vessel', ''),
                            'voyage': row_data.get('Voyage Number', ''),
                            'port': row_data.get('Service', ''),  # Service column often contains port info
                            'purpose': row_data.get('Service', ''),  # Service column contains purpose
                            'controlId': row_data.get('Control Number', ''),
                            'vesselType': row_data.get('Vessel Type', 'Local'),  # Add vessel type
                            'time': row_data.get('Time', ''),  # Add time field
                            'updatedBy': 'system@anchorpoint.com'  # Default since Excel doesn't track this
                        }
                        
                        # Clean up the data
                        for key, value in vessel_entry.items():
                            if value == 'None' or value == '':
                                vessel_entry[key] = 'N/A'
                        
                        all_vessels_data.append(vessel_entry)
        
        # Sort by date (newest first)
        all_vessels_data.sort(key=lambda x: x['date'], reverse=True)
        
        return jsonify({
            "success": True,
            "vessels": all_vessels_data,
            "total": len(all_vessels_data)
        })
        
    except FileNotFoundError as e:
        return jsonify({"success": False, "error": str(e)}), 404
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/analytics/dashboard', methods=['GET'])
def get_dashboard_analytics():
    """Get analytics data for dashboard based on Excel vessel log data."""
    try:
        wb = _load_workbook_or_404(EXCEL_PATH)
        
        # Initialize analytics data based on actual Excel data
        analytics = {
            "totalVessels": 0,
            "vesselsByStatus": {
                "docked": 0,
                "atSea": 0,
                "maintenance": 0
            },
            "operationalEfficiency": 0,
            "crewAvailability": {
                "captains": {"available": 0, "total": 0},
                "engineers": {"available": 0, "total": 0},
                "deckhands": {"available": 0, "total": 0}
            },
            "recentOperations": [],
            "fuelConsumption": {
                "today": 0,
                "thisWeek": 0,
                "vsLastWeek": "0%"
            },
            "maintenanceCompliance": {
                "onTimePercentage": 0,
                "items": []
            },
            "vesselStats": {
                "uniqueVessels": set(),
                "totalOperations": 0,
                "operationsByMonth": {},
                "totalVesselEntries": 0
            }
        }
        
        # Process each sheet (year)
        for sheet_name in wb.sheetnames:
            if sheet_name.isdigit():  # Only process year sheets
                ws = wb[sheet_name]
                year = int(sheet_name)
                
                # Get headers from first row
                headers = []
                if ws.max_row >= 1:
                    headers = [str(c.value).strip() if c.value is not None else '' for c in ws[1]]
                
                # Process data rows
                for row_idx in range(2, ws.max_row + 1):  # Skip header row
                    row_data = {}
                    for col_idx, header in enumerate(headers, 1):
                        cell_value = ws.cell(row=row_idx, column=col_idx).value
                        row_data[header] = str(cell_value).strip() if cell_value is not None else ''
                    
                    # Only process rows that have meaningful data
                    if any(value for value in row_data.values() if value and value != 'None'):
                        vessel_name = row_data.get('Vessel', '')
                        date_str = row_data.get('Date', '')
                        purpose = row_data.get('Service', '')
                        voyage_no = row_data.get('Voyage Number', '')
                        
                        if vessel_name and vessel_name != 'N/A':
                            analytics["vesselStats"]["uniqueVessels"].add(vessel_name)
                            analytics["vesselStats"]["totalOperations"] += 1
                            analytics["vesselStats"]["totalVesselEntries"] += 1
                            
                            # Categorize vessel status based on purpose
                            purpose_lower = purpose.lower()
                            if any(keyword in purpose_lower for keyword in ['dock', 'berth', 'mooring', 'w/mooring']):
                                analytics["vesselsByStatus"]["docked"] += 1
                            elif any(keyword in purpose_lower for keyword in ['departure', 'sail', 'transit', 'loading']):
                                analytics["vesselsByStatus"]["atSea"] += 1
                            elif any(keyword in purpose_lower for keyword in ['maintenance', 'repair', 'inspection']):
                                analytics["vesselsByStatus"]["maintenance"] += 1
                            else:
                                # Default to docked if purpose is unclear
                                analytics["vesselsByStatus"]["docked"] += 1
                            
                            # Add to recent operations (limit to 5 most recent)
                            if len(analytics["recentOperations"]) < 5:
                                # Determine status based on purpose
                                if any(keyword in purpose_lower for keyword in ['dock', 'berth', 'mooring', 'w/mooring']):
                                    status = "Docked"
                                elif any(keyword in purpose_lower for keyword in ['loading', 'cargo']):
                                    status = "Loading"
                                elif any(keyword in purpose_lower for keyword in ['departure', 'sail']):
                                    status = "Departure"
                                else:
                                    status = "Operation"
                                
                                # Use actual date if available, otherwise use current time
                                time_str = "Recent" if not date_str else date_str
                                
                                analytics["recentOperations"].append({
                                    "vessel": vessel_name,
                                    "status": status,
                                    "time": time_str,
                                    "voyage": voyage_no if voyage_no else "N/A"
                                })
        
        # Convert set to count
        analytics["vesselStats"]["uniqueVessels"] = len(analytics["vesselStats"]["uniqueVessels"])
        analytics["totalVessels"] = analytics["vesselStats"]["uniqueVessels"]
        
        # Calculate operational efficiency based on actual data
        total_ops = analytics["vesselStats"]["totalOperations"]
        if total_ops > 0:
            # Calculate efficiency based on successful operations vs total
            successful_ops = analytics["vesselsByStatus"]["docked"] + analytics["vesselsByStatus"]["atSea"]
            analytics["operationalEfficiency"] = round((successful_ops / total_ops) * 100, 1)
        else:
            analytics["operationalEfficiency"] = 0
        
        # Calculate crew availability based on actual vessel operations
        # More operations = more crew needed
        if total_ops > 0:
            # Estimate crew needs based on vessel operations
            captains_needed = min(analytics["totalVessels"], 5)  # Max 5 captains
            engineers_needed = min(total_ops // 2, 7)  # Max 7 engineers
            deckhands_needed = min(total_ops, 15)  # Max 15 deckhands
            
            analytics["crewAvailability"]["captains"]["total"] = captains_needed
            analytics["crewAvailability"]["captains"]["available"] = max(0, captains_needed - 1)  # Assume 1 captain busy
            
            analytics["crewAvailability"]["engineers"]["total"] = engineers_needed
            analytics["crewAvailability"]["engineers"]["available"] = max(0, engineers_needed - 1)  # Assume 1 engineer busy
            
            analytics["crewAvailability"]["deckhands"]["total"] = deckhands_needed
            analytics["crewAvailability"]["deckhands"]["available"] = max(0, deckhands_needed - 3)  # Assume 3 deckhands busy
        
        # Calculate fuel consumption based on vessel operations
        if total_ops > 0:
            # Estimate fuel consumption based on operations
            daily_consumption = total_ops * 100  # 100L per operation
            weekly_consumption = daily_consumption * 7
            
            analytics["fuelConsumption"]["today"] = daily_consumption
            analytics["fuelConsumption"]["thisWeek"] = weekly_consumption
            analytics["fuelConsumption"]["vsLastWeek"] = f"+{min(10, total_ops * 2)}%"  # Growth based on operations
        
        # Calculate maintenance compliance based on vessel status
        if analytics["vesselsByStatus"]["maintenance"] > 0:
            # If there are maintenance operations, compliance is lower
            compliance_rate = max(70, 100 - (analytics["vesselsByStatus"]["maintenance"] * 10))
        else:
            # If no maintenance operations, assume good compliance
            compliance_rate = min(95, 80 + analytics["totalVessels"] * 2)
        
        analytics["maintenanceCompliance"]["onTimePercentage"] = compliance_rate
        
        # Add maintenance items based on vessel status
        maintenance_items = []
        if analytics["vesselsByStatus"]["maintenance"] > 0:
            maintenance_items.append({"task": "Vessel Maintenance", "status": "In Progress"})
        
        # Add standard maintenance items
        maintenance_items.extend([
            {"task": "Safety Inspection", "status": "Complete" if compliance_rate > 90 else "Due"},
            {"task": "Navigation Systems", "status": "Complete" if compliance_rate > 85 else "Pending"},
            {"task": "Engine Check", "status": "Complete" if compliance_rate > 80 else "Due"}
        ])
        
        analytics["maintenanceCompliance"]["items"] = maintenance_items
        
        return jsonify({
            "success": True,
            "analytics": analytics
        })
        
    except FileNotFoundError as e:
        return jsonify({"success": False, "error": str(e)}), 404
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    print("AnchorPoint API Server Starting...")
    print("Health Check: http://localhost:5000/api/health")
    print("Available Endpoints:")
    print("   - GET  /api/health")
    print("   - POST /api/login")
    print("   - POST /api/register") 
    print("   - GET  /api/users/<user_id>")
    print("   - PUT  /api/users/<user_id>")
    print("   - GET  /api/ships")
    print("   - GET  /api/crew")
    print("\n Server will be available at: http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000) 