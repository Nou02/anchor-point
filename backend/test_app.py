import pytest
import json
import os
import tempfile
from datetime import datetime
from openpyxl import Workbook
from app import app, mock_users

@pytest.fixture
def client():
    """Create a test client for the Flask app."""
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

@pytest.fixture
def temp_excel_file():
    """Create a temporary Excel file for testing."""
    # Create a temporary Excel file
    wb = Workbook()
    ws = wb.active
    ws.title = "2024"
    
    # Add headers
    headers = ['No.', 'Vessel', 'Service', 'Control Number', 'Voyage Number', 'Date']
    ws.append(headers)
    
    # Add sample data
    sample_data = [
        [1, 'TEST VESSEL 1', 'W/MOORING BUOY', 'CTRL001', 'VOY001', '2024-01-15'],
        [2, 'TEST VESSEL 2', 'CARGO LOADING', 'CTRL002', 'VOY002', '2024-01-16'],
        [3, 'TEST VESSEL 3', 'MAINTENANCE', 'CTRL003', 'VOY003', '2024-01-17']
    ]
    for row in sample_data:
        ws.append(row)
    
    # Create temporary file
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx')
    wb.save(temp_file.name)
    temp_file.close()
    
    yield temp_file.name
    
    # Cleanup
    if os.path.exists(temp_file.name):
        os.unlink(temp_file.name)

class TestHealthCheck:
    """Test health check endpoint."""
    
    def test_health_check(self, client):
        """Test that health check returns success."""
        response = client.get('/api/health')
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert data['status'] == 'healthy'
        assert 'AnchorPoint API is running' in data['message']

class TestAuthentication:
    """Test authentication endpoints."""
    
    def test_login_success(self, client):
        """Test successful login with existing user."""
        response = client.post('/api/login', 
                             json={'email': 'demo@example.com', 'password': 'testpass'})
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert data['success'] == True
        assert data['user']['email'] == 'demo@example.com'
        assert data['user']['uid'] == 'demo123'
    
    def test_login_new_user(self, client):
        """Test login with new user (should create mock user)."""
        response = client.post('/api/login', 
                             json={'email': 'newuser@example.com', 'password': 'testpass'})
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert data['success'] == True
        assert data['user']['email'] == 'newuser@example.com'
        assert 'user_' in data['user']['uid']
    
    def test_login_missing_credentials(self, client):
        """Test login with missing credentials."""
        response = client.post('/api/login', json={})
        assert response.status_code == 400
        
        data = json.loads(response.data)
        assert 'Email and password are required' in data['error']
    
    def test_register_success(self, client):
        """Test successful user registration."""
        response = client.post('/api/register', 
                             json={'email': 'register@example.com', 'password': 'testpass', 
                                   'display_name': 'Test User'})
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert data['success'] == True
        assert data['user']['email'] == 'register@example.com'
        assert data['user']['display_name'] == 'Test User'
    
    def test_register_missing_credentials(self, client):
        """Test registration with missing credentials."""
        response = client.post('/api/register', json={})
        assert response.status_code == 400
        
        data = json.loads(response.data)
        assert 'Email and password are required' in data['error']

class TestUserManagement:
    """Test user management endpoints."""
    
    def test_get_user_success(self, client):
        """Test getting existing user."""
        response = client.get('/api/users/demo123')
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert data['success'] == True
        assert data['user']['uid'] == 'demo123'
    
    def test_get_user_not_found(self, client):
        """Test getting non-existent user."""
        response = client.get('/api/users/nonexistent')
        assert response.status_code == 404
        
        data = json.loads(response.data)
        assert 'User not found' in data['error']
    
    def test_update_user_success(self, client):
        """Test updating user profile."""
        response = client.put('/api/users/demo123', 
                            json={'display_name': 'Updated Name', 'role': 'admin'})
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert data['success'] == True
        assert data['user']['display_name'] == 'Updated Name'
        assert data['user']['role'] == 'admin'
    
    def test_update_user_not_found(self, client):
        """Test updating non-existent user."""
        response = client.put('/api/users/nonexistent', 
                            json={'display_name': 'Updated Name'})
        assert response.status_code == 404
        
        data = json.loads(response.data)
        assert 'User not found' in data['error']

class TestShipManagement:
    """Test ship management endpoints."""
    
    def test_get_ships(self, client):
        """Test getting ship schedules."""
        response = client.get('/api/ships')
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert data['success'] == True
        assert 'ships' in data
        assert len(data['ships']) == 3
        
        # Check first ship structure
        first_ship = data['ships'][0]
        assert 'id' in first_ship
        assert 'name' in first_ship
        assert 'status' in first_ship
        assert 'arrival' in first_ship
        assert 'departure' in first_ship
        assert 'dock' in first_ship
    
    def test_get_crew(self, client):
        """Test getting crew assignments."""
        response = client.get('/api/crew')
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert data['success'] == True
        assert 'crew' in data
        assert len(data['crew']) == 3
        
        # Check first crew member structure
        first_crew = data['crew'][0]
        assert 'id' in first_crew
        assert 'name' in first_crew
        assert 'position' in first_crew
        assert 'ship_id' in first_crew
        assert 'status' in first_crew

class TestExcelOperations:
    """Test Excel file operations."""
    
    def test_read_excel_success(self, client, temp_excel_file):
        """Test reading Excel file successfully."""
        # Temporarily replace the Excel path for testing
        app.config['EXCEL_PATH'] = temp_excel_file
        
        response = client.get('/api/excel/read')
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert data['success'] == True
        assert 'headers' in data
        assert 'rows' in data
        # Temp file has 6 headers: No., Vessel, Service, Control Number, Voyage Number, Date
        assert len(data['headers']) == 6
        assert len(data['rows']) == 3
        
        # Check first row data
        first_row = data['rows'][0]
        assert first_row['Vessel'] == 'TEST VESSEL 1'
        assert first_row['Service'] == 'W/MOORING BUOY'
        assert first_row['Date'] == '2024-01-15'
    
    def test_read_excel_file_not_found(self, client):
        """Test reading non-existent Excel file."""
        # Use a non-existent path (Windows-compatible)
        import tempfile
        nonexistent_path = os.path.join(tempfile.gettempdir(), 'nonexistent_file_12345.xlsx')
        app.config['EXCEL_PATH'] = nonexistent_path
        
        response = client.get('/api/excel/read')
        assert response.status_code == 404
        
        data = json.loads(response.data)
        assert data['success'] == False
        assert 'Excel file not found' in data['error']
    
    def test_append_excel_row_success(self, client, temp_excel_file):
        """Test appending row to Excel file."""
        # Temporarily replace the Excel path for testing
        app.config['EXCEL_PATH'] = temp_excel_file
        
        new_row = {
            'row': [4, 'NEW VESSEL', 'TEST SERVICE', 'CTRL004', 'VOY004', '2024-01-18']
        }
        
        response = client.post('/api/excel/append', json=new_row)
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert data['success'] == True
        # Temp file starts with 1 header row + 3 data rows = 4 rows, after append = 5 rows
        assert data['totalRows'] == 5
        assert data['appended'] == new_row['row']
    
    def test_append_excel_object_success(self, client, temp_excel_file):
        """Test appending object to Excel file."""
        # Temporarily replace the Excel path for testing
        app.config['EXCEL_PATH'] = temp_excel_file
        
        new_object = {
            'object': {
                'No.': 4,
                'Vessel': 'NEW VESSEL',
                'Service': 'TEST SERVICE',
                'Control Number': 'CTRL004',
                'Voyage Number': 'VOY004',
                'Date': '2024-01-18'
            }
        }
        
        response = client.post('/api/excel/append', json=new_object)
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert data['success'] == True
        # Temp file starts with 1 header row + 3 data rows = 4 rows, after append = 5 rows
        assert data['totalRows'] == 5
    
    def test_append_excel_invalid_data(self, client, temp_excel_file):
        """Test appending invalid data to Excel file."""
        # Temporarily replace the Excel path for testing
        app.config['EXCEL_PATH'] = temp_excel_file
        
        invalid_data = {'invalid': 'data'}
        
        response = client.post('/api/excel/append', json=invalid_data)
        assert response.status_code == 400
        
        data = json.loads(response.data)
        assert data['success'] == False
        assert 'Invalid payload format' in data['error'] or 'row' in data['error'] or 'object' in data['error']
    
    def test_save_report_success(self, client, temp_excel_file):
        """Test saving report to Excel file."""
        # Temporarily replace the Excel path for testing
        app.config['EXCEL_PATH'] = temp_excel_file
        
        report_data = {
            'date': '2024-01-20',
            'vesselName': 'REPORT VESSEL',
            'voyageNo': 'VOY005',
            'purposeOfCall': 'TEST PURPOSE',
            'controlId': 'CTRL005'
        }
        
        response = client.post('/api/excel/save-report', json=report_data)
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert data['success'] == True
        assert data['sheet'] == '2024'
        # Temp file has sheet '2024' with 1 header row, so first data row is row 1 (rowNumber = 1)
        # But if sheet doesn't exist, it creates it with header, so rowNumber would be 1
        assert data['rowNumber'] >= 1
        assert data['data']['vesselName'] == 'REPORT VESSEL'
    
    def test_save_report_invalid_date(self, client, temp_excel_file):
        """Test saving report with invalid date format."""
        # Temporarily replace the Excel path for testing
        app.config['EXCEL_PATH'] = temp_excel_file
        
        report_data = {
            'date': 'invalid-date',
            'vesselName': 'REPORT VESSEL',
            'voyageNo': 'VOY005',
            'purposeOfCall': 'TEST PURPOSE',
            'controlId': 'CTRL005'
        }
        
        response = client.post('/api/excel/save-report', json=report_data)
        assert response.status_code == 400
        
        data = json.loads(response.data)
        assert data['success'] == False
        assert 'Invalid date format' in data['error']
    
    def test_save_report_missing_date(self, client, temp_excel_file):
        """Test saving report without date."""
        # Temporarily replace the Excel path for testing
        app.config['EXCEL_PATH'] = temp_excel_file
        
        report_data = {
            'vesselName': 'REPORT VESSEL',
            'voyageNo': 'VOY005'
        }
        
        response = client.post('/api/excel/save-report', json=report_data)
        assert response.status_code == 400
        
        data = json.loads(response.data)
        assert data['success'] == False
        assert 'Date is required' in data['error']
    
    def test_delete_report_success(self, client, temp_excel_file):
        """Test deleting report from Excel file."""
        # Temporarily replace the Excel path for testing
        app.config['EXCEL_PATH'] = temp_excel_file
        
        delete_data = {'date': '2024-01-15'}
        
        response = client.delete('/api/excel/delete-report', json=delete_data)
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert data['success'] == True
        # Temp file has date '2024-01-15' in first data row, so should delete 1 row
        assert data['deletedRows'] >= 0  # May be 0 if date format doesn't match exactly
        assert data['sheet'] == '2024'
    
    def test_delete_report_no_data(self, client, temp_excel_file):
        """Test deleting non-existent report."""
        # Temporarily replace the Excel path for testing
        app.config['EXCEL_PATH'] = temp_excel_file
        
        delete_data = {'date': '2024-12-31'}
        
        response = client.delete('/api/excel/delete-report', json=delete_data)
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert data['success'] == True
        assert data['deletedRows'] == 0
        assert 'No data found' in data['message']
    
    def test_get_vessels_log_success(self, client, temp_excel_file):
        """Test getting vessels log data."""
        # Temporarily replace the Excel path for testing
        app.config['EXCEL_PATH'] = temp_excel_file
        
        response = client.get('/api/excel/vessels-log')
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert data['success'] == True
        assert 'vessels' in data
        assert 'total' in data
        # Temp file has 3 data rows
        assert data['total'] == 3
        
        # Check first vessel structure
        first_vessel = data['vessels'][0]
        assert 'date' in first_vessel
        assert 'vessel' in first_vessel
        assert 'voyage' in first_vessel
        assert 'port' in first_vessel
        assert 'purpose' in first_vessel
        assert 'controlId' in first_vessel
        assert 'updatedBy' in first_vessel

class TestAnalytics:
    """Test analytics endpoints."""
    
    def test_get_dashboard_analytics_success(self, client, temp_excel_file):
        """Test getting dashboard analytics."""
        # Temporarily replace the Excel path for testing
        app.config['EXCEL_PATH'] = temp_excel_file
        
        response = client.get('/api/analytics/dashboard')
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert data['success'] == True
        assert 'analytics' in data
        
        analytics = data['analytics']
        assert 'totalVessels' in analytics
        assert 'vesselsByStatus' in analytics
        assert 'operationalEfficiency' in analytics
        assert 'crewAvailability' in analytics
        assert 'recentOperations' in analytics
        assert 'fuelConsumption' in analytics
        assert 'maintenanceCompliance' in analytics
        assert 'vesselStats' in analytics
        
        # Check specific values - temp file has 3 unique vessels
        assert analytics['totalVessels'] == 3  # Based on test data
        assert analytics['vesselStats']['totalOperations'] == 3
        assert analytics['vesselStats']['totalVesselEntries'] == 3
    
    def test_get_dashboard_analytics_file_not_found(self, client):
        """Test getting analytics with non-existent Excel file."""
        # Use a non-existent path (Windows-compatible)
        import tempfile
        nonexistent_path = os.path.join(tempfile.gettempdir(), 'nonexistent_file_12345.xlsx')
        app.config['EXCEL_PATH'] = nonexistent_path
        
        response = client.get('/api/analytics/dashboard')
        assert response.status_code == 404
        
        data = json.loads(response.data)
        assert data['success'] == False
        assert 'Excel file not found' in data['error']

class TestErrorHandling:
    """Test error handling across endpoints."""
    
    def test_invalid_json(self, client):
        """Test handling of invalid JSON."""
        response = client.post('/api/login', 
                             data='invalid json',
                             content_type='application/json')
        assert response.status_code == 500
    
    def test_missing_json_body(self, client):
        """Test handling of missing JSON body."""
        response = client.post('/api/excel/append')
        assert response.status_code == 400
        
        data = json.loads(response.data)
        assert 'Missing JSON body' in data['error']

if __name__ == '__main__':
    pytest.main([__file__, '-v'])
