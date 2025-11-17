// Tab-specific authentication utility
// This allows multiple users to be logged in simultaneously in different tabs
// by maintaining separate session state per tab

// Generate or retrieve a unique tab ID
export const getTabId = () => {
  let tabId = sessionStorage.getItem('tabId');
  if (!tabId) {
    tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('tabId', tabId);
  }
  return tabId;
};

// Store the current user for this tab (store full user object as JSON)
export const setTabUser = (user) => {
  const tabId = getTabId();
  if (user) {
    const userData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      // Store any other relevant user data
    };
    sessionStorage.setItem(`tabUser_${tabId}`, JSON.stringify(userData));
  } else {
    sessionStorage.removeItem(`tabUser_${tabId}`);
  }
};

// Get the current user for this tab
export const getTabUser = () => {
  const tabId = getTabId();
  const userStr = sessionStorage.getItem(`tabUser_${tabId}`);
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch (e) {
      return null;
    }
  }
  return null;
};

// Clear the current user for this tab
export const clearTabUser = () => {
  const tabId = getTabId();
  sessionStorage.removeItem(`tabUser_${tabId}`);
};

// Check if a user ID matches the current tab's user
export const isCurrentTabUser = (userId) => {
  const tabUser = getTabUser();
  return tabUser && tabUser.uid === userId;
};

// Check if this tab has an active session
export const hasTabSession = () => {
  return getTabUser() !== null;
};

