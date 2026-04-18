import React, { useEffect, useState, useRef } from 'react';
import './InfoContent.css';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

// Generate a simple user ID based on date and order
const generateUserIdForExistingUser = (createdAt, allUsers, currentUserIndex) => {
  const createdDate = new Date(createdAt);
  const year = createdDate.getFullYear().toString().slice(-2);
  const month = String(createdDate.getMonth() + 1).padStart(2, '0');
  const day = String(createdDate.getDate()).padStart(2, '0');
  const datePrefix = `${year}${month}${day}`;
  
  // Find the highest order number for that date from users that already have userId
  let maxOrder = 0;
  allUsers.forEach((userData) => {
    if (userData.userId && userData.userId.startsWith(datePrefix)) {
      const orderPart = userData.userId.split('-')[1];
      if (orderPart) {
        const orderNum = parseInt(orderPart, 10);
        if (!isNaN(orderNum) && orderNum > maxOrder) {
          maxOrder = orderNum;
        }
      }
    }
  });
  
  // Count how many users on the same date without userId come before this user
  let usersWithoutIdBefore = 0;
  for (let i = 0; i < currentUserIndex; i++) {
    const userData = allUsers[i];
    if (!userData.userId && userData.createdAt) {
      const userCreatedDate = new Date(userData.createdAt);
      if (userCreatedDate.getFullYear() === createdDate.getFullYear() &&
          userCreatedDate.getMonth() === createdDate.getMonth() &&
          userCreatedDate.getDate() === createdDate.getDate()) {
        usersWithoutIdBefore++;
      }
    }
  }
  
  const nextOrder = maxOrder + usersWithoutIdBefore + 1;
  const orderSuffix = String(nextOrder).padStart(3, '0');
  return `${datePrefix}-${orderSuffix}`;
};


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
        const allUsersData = querySnapshot.docs.map(doc => ({
          ...doc.data(),
          uid: doc.id
        }));
        
        // Sort users by createdAt to ensure proper sequencing
        allUsersData.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateA - dateB;
        });
        
        // Generate userId for users that don't have one
        const usersToUpdate = [];
        const userList = allUsersData.map((data, index) => {
          // Use firstName and lastName directly from database
          const firstName = data.firstName || '';
          const lastName = data.lastName || '';
          // Compute fullName from firstName and lastName for display purposes
          const fullName = firstName && lastName 
            ? `${firstName} ${lastName}`.trim() 
            : (data.fullName || data.username || '');
          
          // Generate userId if missing
          let userId = data.userId;
          if (!userId && data.createdAt) {
            userId = generateUserIdForExistingUser(data.createdAt, allUsersData, index);
            usersToUpdate.push({ uid: data.uid, userId });
          }
          
          // Convert "Employee" to "Crew" for backward compatibility
          let role = data.role || data.type || 'Crew';
          let type = data.type || data.role || 'Crew';
          if (role === 'Employee') role = 'Crew';
          if (type === 'Employee') type = 'Crew';
          
          // Set Carla's designation to HR
          const fullNameCheck = fullName.toLowerCase();
          const emailCheck = (data.email || '').toLowerCase();
          const firstNameCheck = firstName.toLowerCase();
          const lastNameCheck = lastName.toLowerCase();
          const isCarla = fullNameCheck.includes('carla') || 
                         emailCheck.includes('carla') ||
                         (firstNameCheck.includes('carla') && lastNameCheck.includes('dela'));
          if (isCarla) {
            role = 'HR';
            type = 'HR';
          }
          
          return {
            ...data,
            uid: data.uid,
            userId: userId,
            firstName: firstName,
            lastName: lastName,
            username: data.username || fullName || '',
            fullName: fullName,
            phone: data.phone || '',
            role: role,
            type: type,
            status: data.status || 'Active',
            createdAt: data.createdAt || new Date(),
            email: data.email || ''
          };
        });
        
        // Update users in Firebase that don't have userId
        for (const userUpdate of usersToUpdate) {
          try {
            await updateDoc(doc(db, 'users', userUpdate.uid), {
              userId: userUpdate.userId
            });
          } catch (error) {
            console.error(`Error updating userId for user ${userUpdate.uid}:`, error);
          }
        }
        
        // Update users with "Employee" role to "Crew" in Firebase
        const usersToUpdateRole = [];
        allUsersData.forEach((data) => {
          if ((data.role === 'Employee' || data.type === 'Employee') && data.uid) {
            usersToUpdateRole.push({ uid: data.uid, role: 'Crew', type: 'Crew' });
          }
        });
        
        // Update Carla's designation to HR in Firebase
        allUsersData.forEach((data) => {
          const firstName = data.firstName || '';
          const lastName = data.lastName || '';
          const fullName = firstName && lastName 
            ? `${firstName} ${lastName}`.trim() 
            : (data.fullName || data.username || '');
          const fullNameCheck = fullName.toLowerCase();
          const emailCheck = (data.email || '').toLowerCase();
          const firstNameCheck = firstName.toLowerCase();
          const lastNameCheck = lastName.toLowerCase();
          const isCarla = fullNameCheck.includes('carla') || 
                         emailCheck.includes('carla') ||
                         (firstNameCheck.includes('carla') && lastNameCheck.includes('dela'));
          
          if (isCarla && data.uid && (data.role !== 'HR' || data.type !== 'HR')) {
            usersToUpdateRole.push({ uid: data.uid, role: 'HR', type: 'HR' });
          }
        });
        
        for (const userUpdate of usersToUpdateRole) {
          try {
            await updateDoc(doc(db, 'users', userUpdate.uid), {
              role: userUpdate.role,
              type: userUpdate.type
            });
          } catch (error) {
            console.error(`Error updating role for user ${userUpdate.uid}:`, error);
          }
        }
        
        setUsers(userList);
      } catch (err) {
        console.error('Error fetching users:', err);
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
        firstName: '',
        lastName: '',
        fullName: '',
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
  const handleEdit = async () => {
    if (editMode) {
      // Save all changes to Firestore when exiting edit mode
      for (const user of users) {
        if (user.uid && !user.isNew) {
          await saveUserChanges(user);
        }
      }
    }
    setEditMode(e => !e);
  };

  // Handle checkbox select
  const handleSelectRow = (uid) => {
    setSelectedRows(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  // Delete selected rows
  const handleDelete = async () => {
    // Delete from Firestore first
    for (const uid of selectedRows) {
      await deleteUserFromFirestore(uid);
    }
    
    // Update local state
    setUsers(users.filter(user => !selectedRows.includes(user.uid)));
    setSelectedRows([]);
  };

  // Handle cell change in edit mode
  const handleCellChange = (uid, field, value) => {
    setUsers(users => users.map(user =>
      user.uid === uid ? { ...user, [field]: value } : user
    ));
  };

  // Save user changes to Firestore
  const saveUserChanges = async (user) => {
    try {
      if (user.uid && !user.isNew) {
        // Use firstName and lastName from database fields
        const firstName = user.firstName || '';
        const lastName = user.lastName || '';
        // Compute fullName from firstName and lastName
        const fullName = firstName && lastName 
          ? `${firstName} ${lastName}`.trim() 
          : '';
        
        // Convert "Employee" to "Crew" when saving
        let role = user.role || 'Crew';
        let type = user.type || 'Crew';
        if (role === 'Employee') role = 'Crew';
        if (type === 'Employee') type = 'Crew';
        
        await updateDoc(doc(db, 'users', user.uid), {
          firstName: firstName, // Save to database firstName field
          lastName: lastName, // Save to database lastName field
          fullName: fullName, // Computed for backward compatibility
          username: fullName || user.username || '',
          email: user.email,
          phone: user.phone,
          role: role,
          type: type,
          status: user.status,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error saving user changes:', error);
    }
  };

  // Delete user from Firestore
  const deleteUserFromFirestore = async (uid) => {
    try {
      if (uid && !uid.startsWith('new-')) {
        await deleteDoc(doc(db, 'users', uid));
      }
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  // Filter users by search - filter by first letter of last name when typing
  const filteredUsers = users.filter(user => {
    const lastName = user.lastName || '';
    const firstName = user.firstName || '';
    const fullName = firstName && lastName 
      ? `${firstName} ${lastName}`.trim() 
      : (user.fullName || user.username || '');
    
    // If search is a single letter, filter by first letter of last name
    if (search.length === 1 && search.match(/[a-zA-Z]/)) {
      return lastName.toLowerCase().charAt(0) === search.toLowerCase();
    }
    
    // Otherwise, search across all fields
    return (
      fullName.toLowerCase().includes(search.toLowerCase()) ||
      firstName.toLowerCase().includes(search.toLowerCase()) ||
      lastName.toLowerCase().includes(search.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (user.phone || '').toLowerCase().includes(search.toLowerCase())
    );
  });

  // Sort users based on sortBy
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (sortBy === 'name') {
      const fullNameA = a.firstName && a.lastName 
        ? `${a.firstName} ${a.lastName}`.trim() 
        : (a.fullName || a.username || '');
      const fullNameB = b.firstName && b.lastName 
        ? `${b.firstName} ${b.lastName}`.trim() 
        : (b.fullName || b.username || '');
      return fullNameA.toLowerCase().localeCompare(fullNameB.toLowerCase());
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
                <th>User ID</th>
                <th>Last Name</th>
                <th>First Name</th>
                <th>Email</th>
                <th>Phone No.</th>
                <th>Designation</th>
                <th>Date Created</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="loading-row">
                  <td colSpan="9" className="loading-cell">
                    <div className="loading-spinner"></div>
                    <span>Loading users...</span>
                  </td>
                </tr>
              ) : sortedUsers.length === 0 ? (
                <tr className="empty-row">
                  <td colSpan="9" className="empty-cell">
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
                    <td className="userid-cell">
                      <span className="user-id-text" title={user.uid || ''}>
                        {user.userId || (user.uid ? `${user.uid.substring(0, 8)}...` : '')}
                      </span>
                    </td>
                    <td className="lastname-cell">
                      {editMode ? (
                        <input 
                          className="table-input"
                          placeholder="Last Name"
                          value={user.lastName || ''} 
                          onChange={e => {
                            handleCellChange(user.uid, 'lastName', e.target.value);
                            // Update fullName for display
                            const fullName = `${user.firstName || ''} ${e.target.value}`.trim();
                            handleCellChange(user.uid, 'fullName', fullName);
                          }}
                        />
                      ) : (
                        <span className="user-name">{user.lastName || ''}</span>
                      )}
                    </td>
                    <td className="firstname-cell">
                      {editMode ? (
                        <input 
                          className="table-input"
                          placeholder="First Name"
                          value={user.firstName || ''} 
                          onChange={e => {
                            handleCellChange(user.uid, 'firstName', e.target.value);
                            // Update fullName for display
                            const fullName = `${e.target.value} ${user.lastName || ''}`.trim();
                            handleCellChange(user.uid, 'fullName', fullName);
                          }}
                        />
                      ) : (
                        <div className="user-info">
                          <div className="user-avatar">
                            {(() => {
                              const firstName = user.firstName || '';
                              return firstName ? firstName.charAt(0).toUpperCase() : 'U';
                            })()}
                          </div>
                          <span className="user-name">{user.firstName || ''}</span>
                        </div>
                      )}
                    </td>
                    <td className="email-cell">
                      {editMode ? (
                        <input 
                          className="table-input"
                          value={user.email || ''} 
                          onChange={e => handleCellChange(user.uid, 'email', e.target.value)} 
                          type="email"
                        />
                      ) : (
                        <span className="email-text">{user.email || ''}</span>
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
                          value={(() => {
                            const role = user.role || user.type || '';
                            return role === 'Employee' ? 'Crew' : role;
                          })()} 
                          onChange={e => {
                            const value = e.target.value === 'Employee' ? 'Crew' : e.target.value;
                            handleCellChange(user.uid, 'role', value);
                            handleCellChange(user.uid, 'type', value);
                          }} 
                        />
                      ) : (
                        <span className={`role-badge ${(() => {
                          const role = user.role || user.type || '';
                          const displayRole = role === 'Employee' ? 'Crew' : role;
                          return displayRole.toLowerCase().replace(/\s+/g, '-');
                        })()}`}>
                          {(() => {
                            const role = user.role || user.type || '';
                            return role === 'Employee' ? 'Crew' : role;
                          })()}
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
