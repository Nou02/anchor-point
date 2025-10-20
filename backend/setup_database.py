#!/usr/bin/env python3
"""
Database setup script for AnchorPoint application
This script helps you set up PostgreSQL database for the application
"""

import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from dotenv import load_dotenv

def create_database():
    """Create the database if it doesn't exist"""
    load_dotenv()
    
    # Get database configuration
    db_host = os.environ.get('DB_HOST', 'localhost')
    db_port = os.environ.get('DB_PORT', '5432')
    db_name = os.environ.get('DB_NAME', 'anchorpoint_db')
    db_user = os.environ.get('DB_USER', 'postgres')
    db_password = os.environ.get('DB_PASSWORD', 'password')
    
    try:
        # Connect to PostgreSQL server (not to specific database)
        conn = psycopg2.connect(
            host=db_host,
            port=db_port,
            user=db_user,
            password=db_password,
            database='postgres'  # Connect to default postgres database
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        # Check if database exists
        cursor.execute(f"SELECT 1 FROM pg_database WHERE datname = '{db_name}'")
        exists = cursor.fetchone()
        
        if not exists:
            # Create database
            cursor.execute(f'CREATE DATABASE "{db_name}"')
            print(f"✅ Database '{db_name}' created successfully!")
        else:
            print(f"ℹ️  Database '{db_name}' already exists.")
        
        cursor.close()
        conn.close()
        
        return True
        
    except psycopg2.Error as e:
        print(f"❌ Error creating database: {e}")
        return False

def test_connection():
    """Test connection to the database"""
    load_dotenv()
    
    db_host = os.environ.get('DB_HOST', 'localhost')
    db_port = os.environ.get('DB_PORT', '5432')
    db_name = os.environ.get('DB_NAME', 'anchorpoint_db')
    db_user = os.environ.get('DB_USER', 'postgres')
    db_password = os.environ.get('DB_PASSWORD', 'password')
    
    try:
        conn = psycopg2.connect(
            host=db_host,
            port=db_port,
            user=db_user,
            password=db_password,
            database=db_name
        )
        cursor = conn.cursor()
        cursor.execute("SELECT version();")
        version = cursor.fetchone()
        print(f"✅ Successfully connected to PostgreSQL!")
        print(f"📊 Version: {version[0]}")
        cursor.close()
        conn.close()
        return True
        
    except psycopg2.Error as e:
        print(f"❌ Error connecting to database: {e}")
        return False

def main():
    """Main setup function"""
    print("🚢 AnchorPoint Database Setup")
    print("=" * 40)
    
    # Check if .env file exists
    if not os.path.exists('.env'):
        print("⚠️  No .env file found. Please create one based on env_example.txt")
        print("📝 Copy env_example.txt to .env and update the values")
        return False
    
    print("1. Creating database...")
    if not create_database():
        return False
    
    print("\n2. Testing connection...")
    if not test_connection():
        return False
    
    print("\n3. Next steps:")
    print("   - Install Python dependencies: pip install -r requirements.txt")
    print("   - Run Flask migrations: flask db init && flask db migrate && flask db upgrade")
    print("   - Seed the database: flask seed-db")
    print("   - Start the application: python app.py")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
