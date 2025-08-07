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
        <h2 className="info-title">USER ACCOUNTS</h2>
        <div className="info-table-meta" style={{alignItems: 'center', justifyContent: 'flex-start', marginBottom: 18, gap: 24, width: '100%'}}>
          <span style={{fontSize: '1.08em', color: '#232b45'}}>
            Showing <b style={{fontWeight: 700, color: '#232b45'}}>{filteredUsers.length}</b> of <b style={{fontWeight: 700, color: '#232b45'}}>{users.length} users</b>
          </span>
          {/* Search bar */}
          <input
            type="text"
            className="info-search"
            placeholder="Search name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              padding: '7px 14px',
              border: '1px solid #bfc6e0',
              borderRadius: 6,
              fontSize: '1em',
              outline: 'none',
              minWidth: 180,
              background: '#fff',
              color: '#232b45'
            }}
          />
          <span className="info-sort" ref={sortRef} style={{marginLeft: 0, position: 'relative', cursor: 'pointer', color: '#232b45', fontWeight: 500}} onClick={() => setSortDropdown(d => !d)}>
            Sort by <span className="info-sort-arrow">▼</span>
            {sortDropdown && (
              <div style={{position: 'absolute', left: 0, top: 24, background: '#fff', color: '#232b45', border: '1px solid #bfc6e0', borderRadius: 6, zIndex: 10, minWidth: 120, boxShadow: '0 2px 8px rgba(30,40,60,0.08)'}}>
                <div style={{padding: '8px 14px', cursor: 'pointer', background: sortBy==='name'?'#e0e4f7':'#fff'}} onClick={() => {setSortBy('name'); setSortDropdown(false);}}>Name</div>
                <div style={{padding: '8px 14px', cursor: 'pointer', background: sortBy==='date'?'#e0e4f7':'#fff'}} onClick={() => {setSortBy('date'); setSortDropdown(false);}}>Date Created</div>
              </div>
            )}
          </span>
          <span className="info-icons" style={{marginLeft: 0, display: 'flex', alignItems: 'center', gap: 10}}>
            <button className="info-add-btn" title="Add" onClick={handleAddRow}>＋</button>
            <button className="info-edit-btn" title="Edit" onClick={handleEdit}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M3 14.25V17h2.75l8.13-8.13-2.75-2.75L3 14.25zM17.71 6.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.13 1.13 3.75 3.75 1.14-1.13z" fill="#232b45"/></svg>
            </button>
            <button className="info-delete-btn" title="Delete" onClick={handleDelete}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M6 7v7a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V7" stroke="#232b45" strokeWidth="1.5"/><rect x="4" y="5" width="12" height="2" rx="1" fill="#232b45"/><rect x="8" y="9" width="1.5" height="5" rx="0.75" fill="#232b45"/><rect x="10.5" y="9" width="1.5" height="5" rx="0.75" fill="#232b45"/></svg>
            </button>
          </span>
        </div>
        <div style={{display: 'flex'}}>
          <table className="info-table" style={{marginLeft: 0}}>
            <thead>
              <tr>
                <th style={{width: 36}}></th>
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
                <tr><td colSpan="7">Loading...</td></tr>
              ) : sortedUsers.length === 0 ? (
                <tr><td colSpan="7">No users found.</td></tr>
              ) : (
                sortedUsers.map((user, i) => (
                  <tr key={user.uid || i} className={selectedRows.includes(user.uid) ? 'row-selected' : ''}>
                    <td style={{textAlign: 'center'}}>
                      <input type="checkbox" checked={selectedRows.includes(user.uid)} onChange={() => handleSelectRow(user.uid)} />
                    </td>
                    <td>
                      {editMode ? (
                        <input value={user.username || user.fullName || ''} onChange={e => handleCellChange(user.uid, 'username', e.target.value)} />
                      ) : (user.username || user.fullName || '')}
                    </td>
                    <td>
                      {editMode ? (
                        <input value={user.password || ''} onChange={e => handleCellChange(user.uid, 'password', e.target.value)} type="text" />
                      ) : '••••••••'}
                    </td>
                    <td>
                      {editMode ? (
                        <input value={user.phone || ''} onChange={e => handleCellChange(user.uid, 'phone', e.target.value)} />
                      ) : (user.phone || '')}
                    </td>
                    <td>
                      {editMode ? (
                        <input value={user.role || user.type || ''} onChange={e => handleCellChange(user.uid, 'role', e.target.value)} />
                      ) : (user.role || user.type || '')}
                    </td>
                    <td>
                      {editMode ? (
                        <input value={user.createdAt && user.createdAt.toDate ? user.createdAt.toDate().toLocaleDateString() : (user.createdAt ? new Date(user.createdAt.seconds ? user.createdAt.seconds * 1000 : user.createdAt).toLocaleDateString() : '')} onChange={() => {}} disabled />
                      ) : (user.createdAt && user.createdAt.toDate ? user.createdAt.toDate().toLocaleDateString() : (user.createdAt ? new Date(user.createdAt.seconds ? user.createdAt.seconds * 1000 : user.createdAt).toLocaleDateString() : ''))}
                    </td>
                    <td>
                      {editMode ? (
                        <input value={user.status || ''} onChange={e => handleCellChange(user.uid, 'status', e.target.value)} />
                      ) : (user.status || '')}
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
