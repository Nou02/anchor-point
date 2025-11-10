import React, { useState, useEffect } from 'react';
import { getFirestore, collection, addDoc, query, getDocs, getDoc, updateDoc, doc, setDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import './Storage.css';

const Storage = () => {
  const [user, setUser] = useState(null);
  const [fuelInventory, setFuelInventory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingFuel, setEditingFuel] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  
  const [formData, setFormData] = useState({
    fuelType: '',
    currentStock: '',
    unit: 'Liters',
    location: '',
    minThreshold: '',
    maxCapacity: '',
    lastUpdated: new Date().toISOString()
  });

  // Load user authentication
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Load fuel inventory from Firestore
  useEffect(() => {
    const loadFuelInventory = async () => {
      if (!user) return;
      
      try {
        const db = getFirestore();
        const q = query(collection(db, 'fuelInventory'), orderBy('lastUpdated', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const inventory = [];
        querySnapshot.forEach((doc) => {
          inventory.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        setFuelInventory(inventory);
      } catch (error) {
        console.error('Error loading fuel inventory:', error);
      }
    };

    if (user) {
      loadFuelInventory();
    }
  }, [user]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      fuelType: '',
      currentStock: '',
      unit: 'Liters',
      location: '',
      minThreshold: '',
      maxCapacity: '',
      lastUpdated: new Date().toISOString()
    });
    setEditingFuel(null);
  };

  // Handle add/edit fuel stock
  const handleSaveFuel = async () => {
    if (!user) return;

    // Validation
    if (!formData.fuelType || !formData.currentStock || !formData.location) {
      setSaveMessage('Please fill in all required fields');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }

    setIsSaving(true);
    setSaveMessage('');

    try {
      const db = getFirestore();
      const fuelData = {
        fuelType: formData.fuelType,
        currentStock: parseFloat(formData.currentStock) || 0,
        unit: formData.unit || 'Liters',
        location: formData.location,
        minThreshold: parseFloat(formData.minThreshold) || 0,
        maxCapacity: parseFloat(formData.maxCapacity) || 0,
        lastUpdated: new Date().toISOString(),
        updatedBy: user.email,
        updatedByName: user.displayName || user.email
      };

      if (editingFuel) {
        // Update existing fuel stock
        await updateDoc(doc(db, 'fuelInventory', editingFuel.id), fuelData);
        setSaveMessage('Fuel stock updated successfully!');
      } else {
        // Add new fuel stock
        await addDoc(collection(db, 'fuelInventory'), fuelData);
        setSaveMessage('Fuel stock added successfully!');
      }

      // Reload inventory
      const q = query(collection(db, 'fuelInventory'), orderBy('lastUpdated', 'desc'));
      const querySnapshot = await getDocs(q);
      const inventory = [];
      querySnapshot.forEach((doc) => {
        inventory.push({
          id: doc.id,
          ...doc.data()
        });
      });
      setFuelInventory(inventory);

      // Reset form and close modal
      resetForm();
      setShowAddModal(false);
      setTimeout(() => setSaveMessage(''), 5000);
    } catch (error) {
      console.error('Error saving fuel stock:', error);
      setSaveMessage('Error saving fuel stock. Please try again.');
      setTimeout(() => setSaveMessage(''), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle edit
  const handleEdit = (fuel) => {
    setEditingFuel(fuel);
    setFormData({
      fuelType: fuel.fuelType || '',
      currentStock: fuel.currentStock || '',
      unit: fuel.unit || 'Liters',
      location: fuel.location || '',
      minThreshold: fuel.minThreshold || '',
      maxCapacity: fuel.maxCapacity || '',
      lastUpdated: fuel.lastUpdated || new Date().toISOString()
    });
    setShowAddModal(true);
  };

  // Handle delete
  const handleDelete = async (fuelId) => {
    if (!window.confirm('Are you sure you want to delete this fuel stock entry?')) {
      return;
    }

    try {
      const db = getFirestore();
      await deleteDoc(doc(db, 'fuelInventory', fuelId));
      
      // Reload inventory
      const q = query(collection(db, 'fuelInventory'), orderBy('lastUpdated', 'desc'));
      const querySnapshot = await getDocs(q);
      const inventory = [];
      querySnapshot.forEach((doc) => {
        inventory.push({
          id: doc.id,
          ...doc.data()
        });
      });
      setFuelInventory(inventory);
      
      setSaveMessage('Fuel stock deleted successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error deleting fuel stock:', error);
      setSaveMessage('Error deleting fuel stock. Please try again.');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  // Calculate stock status
  const getStockStatus = (fuel) => {
    const stock = fuel.currentStock || 0;
    const minThreshold = fuel.minThreshold || 0;
    const maxCapacity = fuel.maxCapacity || 0;
    const percentage = maxCapacity > 0 ? (stock / maxCapacity) * 100 : 0;

    if (stock <= minThreshold) {
      return { status: 'low', color: '#ef4444', label: 'Low Stock' };
    } else if (percentage >= 90) {
      return { status: 'full', color: '#10b981', label: 'Full' };
    } else if (percentage >= 50) {
      return { status: 'adequate', color: '#3b82f6', label: 'Adequate' };
    } else {
      return { status: 'medium', color: '#f59e0b', label: 'Medium' };
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'N/A';
    }
  };

  if (isLoading) {
    return (
      <div className="storage-center-content">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading fuel inventory...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="storage-center-content">
        <div className="access-denied">
          <h2>Access Denied</h2>
          <p>Please log in to access the fuel inventory.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="storage-container">
      <div className="storage-header">
        <div className="storage-title-section">
          <h1>Fuel Inventory Management</h1>
        </div>
        <button
          className="add-fuel-button"
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
        >
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
          Add Fuel Stock
        </button>
      </div>

      {saveMessage && (
        <div className={`save-message ${saveMessage.includes('Error') ? 'error' : 'success'}`}>
          {saveMessage}
        </div>
      )}

      <div className="storage-content">
        {fuelInventory.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="80" height="80" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 6h-2.18c.11-.31.18-.65.18-1a2.996 2.996 0 0 0-5.5-1.65l-.5.67-.5-.68C10.96 2.54 10 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2z"/>
              </svg>
            </div>
            <h3>No Fuel Inventory Data</h3>
            <p>Get started by adding your first fuel stock entry</p>
            <button
              className="add-fuel-button"
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
            >
              Add Fuel Stock
            </button>
          </div>
        ) : (
          <div className="fuel-inventory-grid">
            {fuelInventory.map((fuel) => {
              const status = getStockStatus(fuel);
              const percentage = fuel.maxCapacity > 0 
                ? Math.min((fuel.currentStock / fuel.maxCapacity) * 100, 100) 
                : 0;

              return (
                <div key={fuel.id} className="fuel-card">
                  <div className="fuel-card-header">
                    <div className="fuel-type-section">
                      <h3>{fuel.fuelType}</h3>
                      <span className="fuel-location">{fuel.location}</span>
                    </div>
                    <span 
                      className="stock-status-badge"
                      style={{ backgroundColor: status.color }}
                    >
                      {status.label}
                    </span>
                  </div>

                  <div className="fuel-stock-info">
                    <div className="stock-main">
                      <div className="stock-amount">
                        <span className="stock-value">{fuel.currentStock.toLocaleString()}</span>
                        <span className="stock-unit">{fuel.unit}</span>
                      </div>
                      {fuel.maxCapacity > 0 && (
                        <div className="stock-capacity">
                          of {fuel.maxCapacity.toLocaleString()} {fuel.unit}
                        </div>
                      )}
                    </div>

                    {fuel.maxCapacity > 0 && (
                      <div className="stock-progress-bar">
                        <div
                          className="stock-progress-fill"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: status.color
                          }}
                        ></div>
                      </div>
                    )}

                    <div className="fuel-details">
                      <div className="detail-row">
                        <span className="detail-label">Min Threshold:</span>
                        <span className="detail-value">{fuel.minThreshold || 0} {fuel.unit}</span>
                      </div>
                      {fuel.updatedByName && (
                        <div className="detail-row">
                          <span className="detail-label">Last Updated by:</span>
                          <span className="detail-value">{fuel.updatedByName}</span>
                        </div>
                      )}
                      <div className="detail-row">
                        <span className="detail-label">Last Updated:</span>
                        <span className="detail-value">{formatDate(fuel.lastUpdated)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="fuel-card-actions">
                    <button
                      className="action-button edit-button"
                      onClick={() => handleEdit(fuel)}
                    >
                      <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                      </svg>
                      Edit
                    </button>
                    <button
                      className="action-button delete-button"
                      onClick={() => handleDelete(fuel.id)}
                    >
                      <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                      </svg>
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => {
          if (!isSaving) {
            setShowAddModal(false);
            resetForm();
          }
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingFuel ? 'Edit Fuel Stock' : 'Add Fuel Stock'}</h2>
              <button
                className="modal-close"
                onClick={() => {
                  if (!isSaving) {
                    setShowAddModal(false);
                    resetForm();
                  }
                }}
              >
                <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="fuelType">Fuel Type *</label>
                <input
                  type="text"
                  id="fuelType"
                  name="fuelType"
                  value={formData.fuelType}
                  onChange={handleInputChange}
                  placeholder="e.g., Diesel, Gasoline, Marine Fuel"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="currentStock">Current Stock *</label>
                  <input
                    type="number"
                    id="currentStock"
                    name="currentStock"
                    value={formData.currentStock}
                    onChange={handleInputChange}
                    placeholder="0"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="unit">Unit</label>
                  <select
                    id="unit"
                    name="unit"
                    value={formData.unit}
                    onChange={handleInputChange}
                  >
                    <option value="Liters">Liters</option>
                    <option value="Gallons">Gallons</option>
                    <option value="Barrels">Barrels</option>
                    <option value="Cubic Meters">Cubic Meters</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="location">Storage Location *</label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="e.g., Main Tank, Warehouse A, Dock 5"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="minThreshold">Minimum Threshold</label>
                  <input
                    type="number"
                    id="minThreshold"
                    name="minThreshold"
                    value={formData.minThreshold}
                    onChange={handleInputChange}
                    placeholder="0"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="maxCapacity">Maximum Capacity</label>
                  <input
                    type="number"
                    id="maxCapacity"
                    name="maxCapacity"
                    value={formData.maxCapacity}
                    onChange={handleInputChange}
                    placeholder="0"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="cancel-button"
                onClick={() => {
                  if (!isSaving) {
                    setShowAddModal(false);
                    resetForm();
                  }
                }}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                className="save-button"
                onClick={handleSaveFuel}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : (editingFuel ? 'Update' : 'Add')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Storage;

