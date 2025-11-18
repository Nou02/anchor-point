// Tab-specific authentication utilities
// Uses sessionStorage which is unique per tab, unlike localStorage which is shared

/**
 * Generate a unique tab ID for this tab
 */
export const getTabId = () => {
  let tabId = sessionStorage.getItem('tabId');
  if (!tabId) {
    tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('tabId', tabId);
  }
  return tabId;
};

/**
 * Store user info for this tab
 * @param {Object} user - User object to store
 * @param {boolean} isExplicitLogin - Whether this is an explicit login from this tab
 */
export const setTabUser = (user, isExplicitLogin = false) => {
  const tabId = getTabId();
  sessionStorage.setItem('tabUser', JSON.stringify({
    ...user,
    tabId: tabId,
    timestamp: Date.now()
  }));
  // Mark that this tab has explicitly logged in (not just received a Firebase change)
  if (isExplicitLogin) {
    sessionStorage.setItem('tabHasExplicitLogin', 'true');
  }
  // Also store which tab owns the Firebase session
  if (!localStorage.getItem('firebaseSessionOwner')) {
    localStorage.setItem('firebaseSessionOwner', tabId);
  }
};

/**
 * Check if this tab has explicitly logged in (not just received a Firebase auth change)
 */
export const hasExplicitLogin = () => {
  return sessionStorage.getItem('tabHasExplicitLogin') === 'true';
};

/**
 * Get user info for this tab
 */
export const getTabUser = () => {
  const tabUserStr = sessionStorage.getItem('tabUser');
  if (!tabUserStr) return null;
  try {
    return JSON.parse(tabUserStr);
  } catch (e) {
    return null;
  }
};

/**
 * Clear user info for this tab
 */
export const clearTabUser = () => {
  sessionStorage.removeItem('tabUser');
  sessionStorage.removeItem('tabHasExplicitLogin');
  // Don't clear Firebase session owner - let other tabs keep their sessions
  // Each tab manages its own session independently
};

/**
 * Check if current tab owns the Firebase session
 */
export const isCurrentTabOwner = () => {
  const ownerTabId = localStorage.getItem('firebaseSessionOwner');
  const currentTabId = getTabId();
  return ownerTabId === currentTabId;
};

/**
 * Check if this tab has a user session
 */
export const hasTabSession = () => {
  return !!getTabUser();
};


