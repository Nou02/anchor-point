import React, { useState, useEffect } from 'react';
import { getFirestore, collection, addDoc, query, getDocs, getDoc, updateDoc, doc, setDoc, deleteDoc, orderBy, onSnapshot } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import './Assets.css';
import notificationService from '../services/notificationService';

const Assets = () => {
  const [user, setUser] = useState(null);
  const [isAlice, setIsAlice] = useState(false);
  const [activeTab, setActiveTab] = useState('fuel');
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Asset inventories
  const [fuelInventory, setFuelInventory] = useState([]);
  const [ppeInventory, setPpeInventory] = useState([]);
  const [vehicleInventory, setVehicleInventory] = useState([]);

  // Form data based on asset type
  const [formData, setFormData] = useState({
    // Common fields
    name: '',
    currentStock: '',
    unit: '',
    location: '',
    minThreshold: '',
    maxCapacity: '',
    lastUpdated: new Date().toISOString(),
    // Type-specific fields
    category: '', // For PPE: boots, jumpsuits, gloves, other
    vehicleType: '', // For vehicles: boat, etc.
    registrationNumber: '', // For vehicles
    condition: '', // For vehicles and equipment
    manufacturer: '', // For equipment
    model: '' // For vehicles and equipment
  });

  // Load user authentication and check if user is Alice
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const displayName = currentUser.displayName || '';
        const email = currentUser.email || '';
        const isAliceUser = displayName === 'Alice Margaretha Santos' || 
                           displayName === 'Alice' ||
                           (displayName && displayName.toLowerCase().includes('alice')) ||
                           email.toLowerCase().includes('alice');
        setIsAlice(isAliceUser);
      } else {
        setIsAlice(false);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Load fuel inventory
  useEffect(() => {
    if (!user) return;
    const db = getFirestore();
    const q = query(collection(db, 'fuelInventory'), orderBy('lastUpdated', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const inventory = [];
      querySnapshot.forEach((doc) => {
        inventory.push({ id: doc.id, ...doc.data() });
      });
      setFuelInventory(inventory);
    });
    return () => unsubscribe();
  }, [user]);

  // Load PPE inventory
  useEffect(() => {
    if (!user) return;
    const db = getFirestore();
    const q = query(collection(db, 'ppeInventory'), orderBy('lastUpdated', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const inventory = [];
      querySnapshot.forEach((doc) => {
        inventory.push({ id: doc.id, ...doc.data() });
      });
      setPpeInventory(inventory);
    });
    return () => unsubscribe();
  }, [user]);


  // Load vehicle inventory
  useEffect(() => {
    if (!user) return;
    const db = getFirestore();
    const q = query(collection(db, 'vehicleInventory'), orderBy('lastUpdated', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const inventory = [];
      querySnapshot.forEach((doc) => {
        inventory.push({ id: doc.id, ...doc.data() });
      });
      setVehicleInventory(inventory);
    });
    return () => unsubscribe();
  }, [user]);

  // Get current inventory based on active tab
  const getCurrentInventory = () => {
    switch (activeTab) {
      case 'fuel': return fuelInventory;
      case 'ppe': return ppeInventory;
      case 'vehicles': return vehicleInventory;
      default: return [];
    }
  };

  // Get collection name based on active tab
  const getCollectionName = () => {
    switch (activeTab) {
      case 'fuel': return 'fuelInventory';
      case 'ppe': return 'ppeInventory';
      case 'vehicles': return 'vehicleInventory';
      default: return '';
    }
  };

  // Reset form based on active tab
  const resetForm = () => {
    const defaultForm = {
      name: '',
      currentStock: '',
      unit: '',
      location: '',
      minThreshold: '',
      maxCapacity: '',
      lastUpdated: new Date().toISOString(),
      category: '',
      vehicleType: '',
      registrationNumber: '',
      condition: '',
      manufacturer: '',
      model: ''
    };

    // Set default unit based on tab
    if (activeTab === 'fuel') {
      defaultForm.unit = 'Liters';
    } else if (activeTab === 'ppe') {
      defaultForm.unit = 'Units';
    } else if (activeTab === 'vehicles') {
      defaultForm.unit = 'Count';
    }

    setFormData(defaultForm);
    setEditingAsset(null);
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle save asset
  const handleSaveAsset = async () => {
    if (!user) return;
    
    if (!isAlice) {
      setSaveMessage('Only Alice can add or edit assets');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }

    // Validation
    const isVehicle = activeTab === 'vehicles';
    if (!formData.name || !formData.location || (!isVehicle && !formData.currentStock)) {
      setSaveMessage('Please fill in all required fields');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }

    setIsSaving(true);
    setSaveMessage('');

    try {
      const db = getFirestore();
      const collectionName = getCollectionName();
      const assetData = {
        ...formData,
        lastUpdated: new Date().toISOString(),
        updatedBy: user.email,
        updatedByName: user.displayName || user.email
      };

      // Only add stock-related fields for non-vehicles
      if (activeTab !== 'vehicles') {
        assetData.currentStock = parseFloat(formData.currentStock) || 0;
        assetData.minThreshold = parseFloat(formData.minThreshold) || 0;
        assetData.maxCapacity = parseFloat(formData.maxCapacity) || 0;
      }

      if (editingAsset) {
        await updateDoc(doc(db, collectionName, editingAsset.id), assetData);
        setSaveMessage('Asset updated successfully!');
      } else {
        await addDoc(collection(db, collectionName), assetData);
        setSaveMessage('Asset added successfully!');
      }

      const action = editingAsset ? 'updated' : 'added';
      const assetTypeName = activeTab === 'fuel' ? 'Fuel' : 
                           activeTab === 'ppe' ? 'PPE' : 'Vehicle';
      
      notificationService.addNotification({
        title: `${assetTypeName} ${action.charAt(0).toUpperCase() + action.slice(1)}`,
        message: `${formData.name} at ${formData.location} has been ${action}. Updated by ${user.displayName || user.email}.`,
        type: "storage",
        priority: "medium",
        fromUser: user.displayName || user.email,
        targetRole: "all",
        status: "active"
      });

      // Check for low stock alerts (only for non-vehicles)
      if (activeTab !== 'vehicles') {
        const currentStock = parseFloat(formData.currentStock) || 0;
        const minThreshold = parseFloat(formData.minThreshold) || 0;
        if (currentStock <= minThreshold && minThreshold > 0) {
          notificationService.addNotification({
            title: "Low Stock Alert",
            message: `${formData.name} at ${formData.location} has reached ${currentStock} ${formData.unit}. Please restock soon.`,
            type: "storage",
            priority: "high",
            fromUser: "System",
            targetRole: "admin",
            status: "active"
          });
        }
      }

      resetForm();
      setShowAddModal(false);
      setTimeout(() => setSaveMessage(''), 5000);
    } catch (error) {
      console.error('Error saving asset:', error);
      setSaveMessage('Error saving asset. Please try again.');
      setTimeout(() => setSaveMessage(''), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle edit
  const handleEdit = (asset) => {
    if (!isAlice) {
      alert('Only Alice can edit assets');
      return;
    }
    
    setEditingAsset(asset);
    setFormData({
      name: asset.name || asset.fuelType || '',
      currentStock: asset.currentStock || '',
      unit: asset.unit || '',
      location: asset.location || '',
      minThreshold: asset.minThreshold || '',
      maxCapacity: asset.maxCapacity || '',
      lastUpdated: asset.lastUpdated || new Date().toISOString(),
      category: asset.category || '',
      vehicleType: asset.vehicleType || '',
      registrationNumber: asset.registrationNumber || '',
      condition: asset.condition || '',
      manufacturer: asset.manufacturer || '',
      model: asset.model || ''
    });
    setShowAddModal(true);
  };

  // Handle delete
  const handleDelete = async (assetId) => {
    if (!isAlice) {
      alert('Only Alice can delete assets');
      return;
    }
    
    if (!window.confirm('Are you sure you want to delete this asset?')) {
      return;
    }

    try {
      const db = getFirestore();
      const collectionName = getCollectionName();
      await deleteDoc(doc(db, collectionName, assetId));
      setSaveMessage('Asset deleted successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error deleting asset:', error);
      setSaveMessage('Error deleting asset. Please try again.');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  // Calculate stock status
  const getStockStatus = (asset) => {
    const stock = asset.currentStock || 0;
    const minThreshold = asset.minThreshold || 0;
    const maxCapacity = asset.maxCapacity || 0;
    const percentage = maxCapacity > 0 ? (stock / maxCapacity) * 100 : 0;

    if (stock <= minThreshold && minThreshold > 0) {
      return { status: 'low', color: '#ef4444', label: 'Low Stock' };
    } else if (percentage >= 90 && maxCapacity > 0) {
      return { status: 'full', color: '#10b981', label: 'Full' };
    } else if (percentage >= 50 && maxCapacity > 0) {
      return { status: 'adequate', color: '#3b82f6', label: 'Adequate' };
    } else if (maxCapacity > 0) {
      return { status: 'medium', color: '#f59e0b', label: 'Medium' };
    } else {
      return { status: 'ok', color: '#3b82f6', label: 'OK' };
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

  // Render form fields based on active tab
  const renderFormFields = () => {
    const fields = [];

    // Common fields
    if (activeTab === 'fuel') {
      fields.push(
        <div key="name" className="form-group">
          <label htmlFor="name">Fuel Type *</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="e.g., Diesel, Gasoline, Marine Fuel"
            required
          />
        </div>
      );
    } else if (activeTab === 'ppe') {
      fields.push(
        <div key="name" className="form-group">
          <label htmlFor="name">PPE Item Name *</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="e.g., Safety Boots, Jumpsuit, Gloves"
            required
          />
        </div>,
        <div key="category" className="form-group">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleInputChange}
          >
            <option value="">Select Category</option>
            <option value="boots">Boots</option>
            <option value="jumpsuits">Jumpsuits</option>
            <option value="gloves">Gloves</option>
            <option value="other">Other</option>
          </select>
        </div>
      );
    } else if (activeTab === 'vehicles') {
      fields.push(
        <div key="name" className="form-group">
          <label htmlFor="name">Vehicle Name *</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="e.g., Work Boat 1, Patrol Boat"
            required
          />
        </div>,
        <div key="vehicleType" className="form-group">
          <label htmlFor="vehicleType">Vehicle Type</label>
          <select
            id="vehicleType"
            name="vehicleType"
            value={formData.vehicleType}
            onChange={handleInputChange}
          >
            <option value="">Select Type</option>
            <option value="boat">Boat</option>
            <option value="other">Other</option>
          </select>
        </div>,
        <div key="registrationNumber" className="form-group">
          <label htmlFor="registrationNumber">Registration Number</label>
          <input
            type="text"
            id="registrationNumber"
            name="registrationNumber"
            value={formData.registrationNumber}
            onChange={handleInputChange}
            placeholder="Registration/ID number"
          />
        </div>,
        <div key="model" className="form-group">
          <label htmlFor="model">Model</label>
          <input
            type="text"
            id="model"
            name="model"
            value={formData.model}
            onChange={handleInputChange}
            placeholder="Vehicle model"
          />
        </div>,
        <div key="condition" className="form-group">
          <label htmlFor="condition">Condition</label>
          <select
            id="condition"
            name="condition"
            value={formData.condition}
            onChange={handleInputChange}
          >
            <option value="">Select Condition</option>
            <option value="excellent">Excellent</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
            <option value="needs-repair">Needs Repair</option>
          </select>
        </div>
      );
    }

    // Common fields for all types (except vehicles)
    if (activeTab !== 'vehicles') {
      fields.push(
        <div key="stock-row" className="form-row">
          <div className="form-group">
            <label htmlFor="currentStock">Current Stock/Count *</label>
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
            <input
              type="text"
              id="unit"
              name="unit"
              value={formData.unit}
              onChange={handleInputChange}
              placeholder={activeTab === 'fuel' ? 'Liters' : 'Units'}
            />
          </div>
        </div>,
        <div key="location" className="form-group">
          <label htmlFor="location">Location *</label>
          <input
            type="text"
            id="location"
            name="location"
            value={formData.location}
            onChange={handleInputChange}
            placeholder="Storage location"
            required
          />
        </div>,
        <div key="threshold-row" className="form-row">
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
      );
    } else {
      // For vehicles, only show location
      fields.push(
        <div key="location" className="form-group">
          <label htmlFor="location">Location *</label>
          <input
            type="text"
            id="location"
            name="location"
            value={formData.location}
            onChange={handleInputChange}
            placeholder="Storage location"
            required
          />
        </div>
      );
    }

    return fields;
  };

  // Render asset card
  const renderAssetCard = (asset) => {
    const isVehicle = activeTab === 'vehicles';
    const status = isVehicle ? null : getStockStatus(asset);
    const percentage = !isVehicle && asset.maxCapacity > 0 
      ? Math.min((asset.currentStock / asset.maxCapacity) * 100, 100) 
      : 0;
    const displayName = asset.name || asset.fuelType || 'N/A';

    return (
      <div key={asset.id} className="asset-card">
        <div className="asset-card-header">
          <div className="asset-name-section">
            <h3>{displayName}</h3>
            <span className="asset-location">{asset.location}</span>
          </div>
          {!isVehicle && status && (
            <span 
              className="stock-status-badge"
              style={{ backgroundColor: status.color }}
            >
              {status.label}
            </span>
          )}
        </div>

        {!isVehicle && (
          <div className="asset-stock-info">
            <div className="stock-main">
              <div className="stock-amount">
                <span className="stock-value">{(asset.currentStock || 0).toLocaleString()}</span>
                <span className="stock-unit">{asset.unit || ''}</span>
              </div>
              {asset.maxCapacity > 0 && (
                <div className="stock-capacity">
                  of {asset.maxCapacity.toLocaleString()} {asset.unit}
                </div>
              )}
            </div>

            {asset.maxCapacity > 0 && (
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
          </div>
        )}

          <div className="asset-details">
            {asset.category && (
              <div className="detail-row">
                <span className="detail-label">Category:</span>
                <span className="detail-value">{asset.category}</span>
              </div>
            )}
            {asset.vehicleType && (
              <div className="detail-row">
                <span className="detail-label">Type:</span>
                <span className="detail-value">{asset.vehicleType}</span>
              </div>
            )}
            {asset.registrationNumber && (
              <div className="detail-row">
                <span className="detail-label">Registration:</span>
                <span className="detail-value">{asset.registrationNumber}</span>
              </div>
            )}
            {asset.condition && (
              <div className="detail-row">
                <span className="detail-label">Condition:</span>
                <span className="detail-value">{asset.condition}</span>
              </div>
            )}
            {asset.manufacturer && (
              <div className="detail-row">
                <span className="detail-label">Manufacturer:</span>
                <span className="detail-value">{asset.manufacturer}</span>
              </div>
            )}
            {asset.model && (
              <div className="detail-row">
                <span className="detail-label">Model:</span>
                <span className="detail-value">{asset.model}</span>
              </div>
            )}
            {!isVehicle && asset.minThreshold > 0 && (
              <div className="detail-row">
                <span className="detail-label">Min Threshold:</span>
                <span className="detail-value">{asset.minThreshold} {asset.unit}</span>
              </div>
            )}
            {asset.updatedByName && (
              <div className="detail-row">
                <span className="detail-label">Last Updated by:</span>
                <span className="detail-value">{asset.updatedByName}</span>
              </div>
            )}
            <div className="detail-row">
              <span className="detail-label">Last Updated:</span>
              <span className="detail-value">{formatDate(asset.lastUpdated)}</span>
            </div>
          </div>

        {isAlice && (
          <div className="asset-card-actions">
            <button
              className="action-button edit-button"
              onClick={() => handleEdit(asset)}
            >
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
              </svg>
              Edit
            </button>
            <button
              className="action-button delete-button"
              onClick={() => handleDelete(asset.id)}
            >
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
              Delete
            </button>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="assets-center-content">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading assets...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="assets-center-content">
        <div className="access-denied">
          <h2>Access Denied</h2>
          <p>Please log in to access the assets management.</p>
        </div>
      </div>
    );
  }

  const currentInventory = getCurrentInventory();
  const tabLabels = {
    fuel: 'Fuel',
    ppe: 'PPE',
    vehicles: 'Vehicles'
  };

  return (
    <div className="assets-container">
      <div className="assets-header">
        <div className="assets-title-section">
          <h1>Assets Management</h1>
        </div>
        {isAlice && (
          <button
            className="add-asset-button"
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
          >
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            Add {tabLabels[activeTab]}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="assets-tabs">
        <button
          className={`tab-button ${activeTab === 'fuel' ? 'active' : ''}`}
          onClick={() => setActiveTab('fuel')}
        >
          Fuel
        </button>
        <button
          className={`tab-button ${activeTab === 'ppe' ? 'active' : ''}`}
          onClick={() => setActiveTab('ppe')}
        >
          PPE
        </button>
        <button
          className={`tab-button ${activeTab === 'vehicles' ? 'active' : ''}`}
          onClick={() => setActiveTab('vehicles')}
        >
          Vehicles
        </button>
      </div>

      {saveMessage && (
        <div className={`save-message ${saveMessage.includes('Error') ? 'error' : 'success'}`}>
          {saveMessage}
        </div>
      )}

      <div className="assets-content">
        {currentInventory.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="80" height="80" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 6h-2.18c.11-.31.18-.65.18-1a2.996 2.996 0 0 0-5.5-1.65l-.5.67-.5-.68C10.96 2.54 10 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2z"/>
              </svg>
            </div>
            <h3>No {tabLabels[activeTab]} Data</h3>
            <p>Get started by adding your first {tabLabels[activeTab].toLowerCase()} entry</p>
            {isAlice && (
              <button
                className="add-asset-button"
                onClick={() => {
                  resetForm();
                  setShowAddModal(true);
                }}
              >
                Add {tabLabels[activeTab]}
              </button>
            )}
          </div>
        ) : (
          <div className="assets-inventory-grid">
            {currentInventory.map((asset) => renderAssetCard(asset))}
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
              <h2>{editingAsset ? `Edit ${tabLabels[activeTab]}` : `Add ${tabLabels[activeTab]}`}</h2>
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
              {renderFormFields()}
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
                onClick={handleSaveAsset}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : (editingAsset ? 'Update' : 'Add')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Assets;

