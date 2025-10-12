from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import uuid

db = SQLAlchemy()

class User(db.Model):
    """User model for authentication and user management"""
    __tablename__ = 'users'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    display_name = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(50), default='user')
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'uid': self.id,
            'email': self.email,
            'display_name': self.display_name,
            'role': self.role,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Ship(db.Model):
    """Ship model for vessel management"""
    __tablename__ = 'ships'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(200), nullable=False)
    status = db.Column(db.String(50), nullable=False)  # docked, in_transit, scheduled
    arrival = db.Column(db.DateTime, nullable=True)
    departure = db.Column(db.DateTime, nullable=True)
    dock = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    crew_members = db.relationship('CrewMember', backref='ship', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'status': self.status,
            'arrival': self.arrival.isoformat() if self.arrival else None,
            'departure': self.departure.isoformat() if self.departure else None,
            'dock': self.dock,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class CrewMember(db.Model):
    """Crew member model for personnel management"""
    __tablename__ = 'crew_members'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(200), nullable=False)
    position = db.Column(db.String(100), nullable=False)
    ship_id = db.Column(db.String(36), db.ForeignKey('ships.id'), nullable=True)
    status = db.Column(db.String(50), nullable=False)  # on_duty, off_duty
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'position': self.position,
            'ship_id': self.ship_id,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Report(db.Model):
    """Report model for daily reports"""
    __tablename__ = 'reports'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    date = db.Column(db.String(20), nullable=False, index=True)  # Format: MM-DD-YYYY
    port_location = db.Column(db.String(200), nullable=True)
    voyage_no = db.Column(db.String(100), nullable=True)
    vessel_name = db.Column(db.String(200), nullable=True)
    purpose_of_call = db.Column(db.Text, nullable=True)
    work_activities = db.Column(db.JSON, nullable=True)  # Store as JSON array
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = db.Column(db.String(200), nullable=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'date': self.date,
            'portLocation': self.port_location,
            'voyageNo': self.voyage_no,
            'vesselName': self.vessel_name,
            'purposeOfCall': self.purpose_of_call,
            'workActivities': self.work_activities or [],
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'updatedBy': self.updated_by
        }

class PayrollRecord(db.Model):
    """Payroll record model"""
    __tablename__ = 'payroll_records'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    employee_name = db.Column(db.String(200), nullable=False)
    position = db.Column(db.String(100), nullable=False)
    hourly_rate = db.Column(db.Numeric(10, 2), nullable=False)
    hours_worked = db.Column(db.Numeric(8, 2), nullable=False)
    overtime_hours = db.Column(db.Numeric(8, 2), default=0)
    total_pay = db.Column(db.Numeric(10, 2), nullable=False)
    pay_period_start = db.Column(db.Date, nullable=False)
    pay_period_end = db.Column(db.Date, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'employee_name': self.employee_name,
            'position': self.position,
            'hourly_rate': float(self.hourly_rate),
            'hours_worked': float(self.hours_worked),
            'overtime_hours': float(self.overtime_hours),
            'total_pay': float(self.total_pay),
            'pay_period_start': self.pay_period_start.isoformat() if self.pay_period_start else None,
            'pay_period_end': self.pay_period_end.isoformat() if self.pay_period_end else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
