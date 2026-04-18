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
    const user = JSON.parse(tabUserStr);
    // Get current tab ID (this will create one if it doesn't exist)
    const currentTabId = getTabId();
    
    // If user has a tabId and it doesn't match, this might be from a different tab
    // But we should be lenient - if the tabId doesn't exist in the user object,
    // it might be from an older session, so we'll accept it and update it
    if (user.tabId && user.tabId !== currentTabId) {
      // This is likely from a different tab - reject it
      console.warn(`[Tab ${currentTabId}] Found user data for different tab (${user.tabId}). Rejecting.`);
      return null;
    }
    
    // If user doesn't have a tabId, or it matches, return the user
    // Also update the tabId if it's missing (for backward compatibility)
    if (!user.tabId) {
      user.tabId = currentTabId;
      sessionStorage.setItem('tabUser', JSON.stringify(user));
    }
    
    return user;
  } catch (e) {
    return null;
  }
};

/**
 * Clear user info for this tab
 */
export const clearTabUser = () => {
  const tabId = getTabId();
  console.log(`[Tab ${tabId}] Clearing sessionStorage for this tab only`);
  sessionStorage.removeItem('tabUser');
  sessionStorage.removeItem('tabHasExplicitLogin');
  // Don't clear Firebase session owner - let other tabs keep their sessions
  // Each tab manages its own session independently
  console.log(`[Tab ${tabId}] SessionStorage cleared. Other tabs should not be affected.`);
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


