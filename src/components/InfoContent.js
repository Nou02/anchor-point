import React, { useEffect, useState, useRef } from 'react';
import './InfoContent.css';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';


const InfoContent = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(true);
  const [selectedRows, setSelectedRows] = useState([]);
  const [sortBy, setSortBy] = useState('name');
  const [sortDropdown, setSortDropdown] = useState(false);
  const [search, setSearch] = useState('');
  const sortRef = useRef(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const userList = querySnapshot.docs.map(doc => doc.data());
        setUsers(userList);
      } catch (err) {
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  // Add new row (local only)
  const handleAddRow = () => {
    setUsers([
      ...users,
      {
        username: '',
        phone: '',
        role: '',
        createdAt: new Date(),
        status: '',
        uid: `new-${Date.now()}`,
        isNew: true
      }
    ]);
  };

  // Toggle edit mode
  const handleEdit = () => setEditMode(e => !e);

  // Handle checkbox select
  const handleSelectRow = (uid) => {
    setSelectedRows(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  // Delete selected rows (local only)
  const handleDelete = () => {
    setUsers(users.filter(user => !selectedRows.includes(user.uid)));
    setSelectedRows([]);
  };

  // Handle cell change in edit mode
  const handleCellChange = (uid, field, value) => {
    setUsers(users => users.map(user =>
      user.uid === uid ? { ...user, [field]: value } : user
    ));
  };

  // Filter users by search
  const filteredUsers = users.filter(user =>
    (user.username || user.fullName || '')
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  // Sort users based on sortBy
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (sortBy === 'name') {
      const nameA = (a.username || a.fullName || '').toLowerCase();
      const nameB = (b.username || b.fullName || '').toLowerCase();
      return nameA.localeCompare(nameB);
    } else if (sortBy === 'date') {
      const dateA = a.createdAt && a.createdAt.seconds ? a.createdAt.seconds : (a.createdAt ? new Date(a.createdAt).getTime() / 1000 : 0);
      const dateB = b.createdAt && b.createdAt.seconds ? b.createdAt.seconds : (b.createdAt ? new Date(b.createdAt).getTime() / 1000 : 0);
      return dateA - dateB;
    }
    return 0;
  });

  // Handle click outside for dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (sortRef.current && !sortRef.current.contains(event.target)) {
        setSortDropdown(false);
      }
    }
    if (sortDropdown) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [sortDropdown]);

  return (
    <div className="main-content">
      <div className="info-content">
        <div className="info-header">
          <h2 className="info-title">USER ACCOUNTS</h2>
          <p className="info-subtitle">Manage user accounts and permissions</p>
        </div>
        
        <div className="info-controls">
          <div className="info-stats">
            <span className="info-count">
              Showing <strong>{filteredUsers.length}</strong> of <strong>{users.length}</strong> users
            </span>
          </div>
          
          <div className="info-actions">
            <div className="search-container">
              <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M21 21L16.514 16.506L21 21ZM19 10.5C19 15.194 15.194 19 10.5 19C5.806 19 2 15.194 2 10.5C2 5.806 5.806 2 10.5 2C15.194 2 19 5.806 19 10.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <input
                type="text"
                className="info-search"
                placeholder="Search users..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            
            <div className="sort-container" ref={sortRef}>
              <button className="sort-button" onClick={() => setSortDropdown(d => !d)}>
                <span>Sort by</span>
                <svg className="sort-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {sortDropdown && (
                <div className="sort-dropdown">
                  <div className={`sort-option ${sortBy === 'name' ? 'active' : ''}`} onClick={() => {setSortBy('name'); setSortDropdown(false);}}>
                    Name
                  </div>
                  <div className={`sort-option ${sortBy === 'date' ? 'active' : ''}`} onClick={() => {setSortBy('date'); setSortDropdown(false);}}>
                    Date Created
                  </div>
                </div>
              )}
            </div>
            
            <div className="action-buttons">
              <button className="action-btn add-btn" title="Add User" onClick={handleAddRow}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Add User
              </button>
              <button className="action-btn edit-btn" title="Edit Mode" onClick={handleEdit}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13M18.5 2.5C18.8978 2.10218 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10218 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10218 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {editMode ? 'Save' : 'Edit'}
              </button>
              <button className="action-btn delete-btn" title="Delete Selected" onClick={handleDelete} disabled={selectedRows.length === 0}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Delete
              </button>
            </div>
          </div>
        </div>
        <div className="table-container">
          <table className="info-table">
            <thead>
              <tr>
                <th className="checkbox-column">
                  <input type="checkbox" className="select-all-checkbox" />
                </th>
                <th>Username</th>
                <th>Password</th>
                <th>Phone No.</th>
                <th>User Type</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="loading-row">
                  <td colSpan="7" className="loading-cell">
                    <div className="loading-spinner"></div>
                    <span>Loading users...</span>
                  </td>
                </tr>
              ) : sortedUsers.length === 0 ? (
                <tr className="empty-row">
                  <td colSpan="7" className="empty-cell">
                    <div className="empty-state">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                        <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <h3>No users found</h3>
                      <p>Try adjusting your search criteria or add a new user.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedUsers.map((user, i) => (
                  <tr key={user.uid || i} className={`user-row ${selectedRows.includes(user.uid) ? 'row-selected' : ''}`}>
                    <td className="checkbox-column">
                      <input 
                        type="checkbox" 
                        className="row-checkbox"
                        checked={selectedRows.includes(user.uid)} 
                        onChange={() => handleSelectRow(user.uid)} 
                      />
                    </td>
                    <td className="username-cell">
                      {editMode ? (
                        <input 
                          className="table-input"
                          value={user.username || user.fullName || ''} 
                          onChange={e => handleCellChange(user.uid, 'username', e.target.value)} 
                        />
                      ) : (
                        <div className="user-info">
                          <div className="user-avatar">
                            {(user.username || user.fullName || 'U').charAt(0).toUpperCase()}
                          </div>
                          <span className="user-name">{user.username || user.fullName || ''}</span>
                        </div>
                      )}
                    </td>
                    <td className="password-cell">
                      {editMode ? (
                        <input 
                          className="table-input"
                          value={user.password || ''} 
                          onChange={e => handleCellChange(user.uid, 'password', e.target.value)} 
                          type="text" 
                        />
                      ) : (
                        <span className="password-mask">••••••••</span>
                      )}
                    </td>
                    <td className="phone-cell">
                      {editMode ? (
                        <input 
                          className="table-input"
                          value={user.phone || ''} 
                          onChange={e => handleCellChange(user.uid, 'phone', e.target.value)} 
                        />
                      ) : (
                        <span className="phone-number">{user.phone || ''}</span>
                      )}
                    </td>
                    <td className="role-cell">
                      {editMode ? (
                        <input 
                          className="table-input"
                          value={user.role || user.type || ''} 
                          onChange={e => handleCellChange(user.uid, 'role', e.target.value)} 
                        />
                      ) : (
                        <span className={`role-badge ${(user.role || user.type || '').toLowerCase().replace(/\s+/g, '-')}`}>
                          {user.role || user.type || ''}
                        </span>
                      )}
                    </td>
                    <td className="date-cell">
                      {editMode ? (
                        <input 
                          className="table-input"
                          value={user.createdAt && user.createdAt.toDate ? user.createdAt.toDate().toLocaleDateString() : (user.createdAt ? new Date(user.createdAt.seconds ? user.createdAt.seconds * 1000 : user.createdAt).toLocaleDateString() : '')} 
                          onChange={() => {}} 
                          disabled 
                        />
                      ) : (
                        <span className="date-text">
                          {user.createdAt && user.createdAt.toDate ? user.createdAt.toDate().toLocaleDateString() : (user.createdAt ? new Date(user.createdAt.seconds ? user.createdAt.seconds * 1000 : user.createdAt).toLocaleDateString() : '')}
                        </span>
                      )}
                    </td>
                    <td className="status-cell">
                      {editMode ? (
                        <input 
                          className="table-input"
                          value={user.status || ''} 
                          onChange={e => handleCellChange(user.uid, 'status', e.target.value)} 
                        />
                      ) : (
                        <span className={`status-badge ${user.status ? 'active' : 'inactive'}`}>
                          {user.status || 'Inactive'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InfoContent;
