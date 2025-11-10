// Shared utilities for payroll components

// Helper function to get user initials
export function getInitials(name, email) {
  if (name) {
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  if (email) return email[0].toUpperCase();
  return '?';
}

// Default workers list
export const WORKERS_LIST = [
  "Bryan Matthew Cruz",
  "David Emmanuel Reyes",
  "Junnel, Cusi",
  "Aljon, Dipasupil",
  "Phil Allen, Eje",
  "Rhed, Escalon",
  "Fortune, Garcia Jr.",
  "Keith, Javier",
  "Ericson, Mendoza",
  "Alec, Sino-ag",
  "Romeo, Velasquez",
  "Rodel, Maranan",
  "Alloi, Sino-ag"
];

// Default table data generator
export function generateDefaultTableData() {
  return [
    { id: 1, workerName: 'Bryan Matthew Cruz', localMooringCount: '', localUnmooringCount: '', foreignMooringCount: '', foreignUnmooringCount: '', sss: '', pagibig: '', philhealth: '', cashAdvance: '' },
    { id: 2, workerName: 'David Emmanuel Reyes', localMooringCount: '', localUnmooringCount: '', foreignMooringCount: '', foreignUnmooringCount: '', sss: '', pagibig: '', philhealth: '', cashAdvance: '' },
    { id: 3, workerName: 'Junnel, Cusi', localMooringCount: '', localUnmooringCount: '', foreignMooringCount: '', foreignUnmooringCount: '', sss: '', pagibig: '', philhealth: '', cashAdvance: '' },
    { id: 4, workerName: 'Aljon, Dipasupil', localMooringCount: '', localUnmooringCount: '', foreignMooringCount: '', foreignUnmooringCount: '', sss: '', pagibig: '', philhealth: '', cashAdvance: '' },
    { id: 5, workerName: 'Phil Allen, Eje', localMooringCount: '', localUnmooringCount: '', foreignMooringCount: '', foreignUnmooringCount: '', sss: '', pagibig: '', philhealth: '', cashAdvance: '' },
    { id: 6, workerName: 'Rhed, Escalon', localMooringCount: '', localUnmooringCount: '', foreignMooringCount: '', foreignUnmooringCount: '', sss: '', pagibig: '', philhealth: '', cashAdvance: '' },
    { id: 7, workerName: 'Fortune, Garcia Jr.', localMooringCount: '', localUnmooringCount: '', foreignMooringCount: '', foreignUnmooringCount: '', sss: '', pagibig: '', philhealth: '', cashAdvance: '' },
    { id: 8, workerName: 'Keith, Javier', localMooringCount: '', localUnmooringCount: '', foreignMooringCount: '', foreignUnmooringCount: '', sss: '', pagibig: '', philhealth: '', cashAdvance: '' },
    { id: 9, workerName: 'Ericson, Mendoza', localMooringCount: '', localUnmooringCount: '', foreignMooringCount: '', foreignUnmooringCount: '', sss: '', pagibig: '', philhealth: '', cashAdvance: '' },
    { id: 10, workerName: 'Alec, Sino-ag', localMooringCount: '', localUnmooringCount: '', foreignMooringCount: '', foreignUnmooringCount: '', sss: '', pagibig: '', philhealth: '', cashAdvance: '' },
    { id: 11, workerName: 'Romeo, Velasquez', localMooringCount: '', localUnmooringCount: '', foreignMooringCount: '', foreignUnmooringCount: '', sss: '', pagibig: '', philhealth: '', cashAdvance: '' },
    { id: 12, workerName: 'Rodel, Maranan', localMooringCount: '', localUnmooringCount: '', foreignMooringCount: '', foreignUnmooringCount: '', sss: '', pagibig: '', philhealth: '', cashAdvance: '' },
    { id: 13, workerName: 'Alloi, Sino-ag', localMooringCount: '', localUnmooringCount: '', foreignMooringCount: '', foreignUnmooringCount: '', sss: '', pagibig: '', philhealth: '', cashAdvance: '' }
  ];
}

// Default pricing configuration
export const DEFAULT_PRICING_CONFIG = {
  localMooringPrice: 500,
  localUnmooringPrice: 500,
  foreignMooringPrice: 800,
  foreignUnmooringPrice: 800
};

// Calculate payroll totals
export function calculatePayrollTotals(tableData, pricingConfig) {
  let totalEarnings = 0;
  let totalSSS = 0;
  let totalPagibig = 0;
  let totalPhilhealth = 0;
  let totalCashAdvance = 0;
  
  tableData.forEach(row => {
    const localMooringCount = parseFloat(row.localMooringCount) || 0;
    const localUnmooringCount = parseFloat(row.localUnmooringCount) || 0;
    const foreignMooringCount = parseFloat(row.foreignMooringCount) || 0;
    const foreignUnmooringCount = parseFloat(row.foreignUnmooringCount) || 0;
    
    const localMooringEarnings = localMooringCount * (pricingConfig.localMooringPrice || 500);
    const localUnmooringEarnings = localUnmooringCount * (pricingConfig.localUnmooringPrice || 500);
    const foreignMooringEarnings = foreignMooringCount * (pricingConfig.foreignMooringPrice || 800);
    const foreignUnmooringEarnings = foreignUnmooringCount * (pricingConfig.foreignUnmooringPrice || 800);
    
    totalEarnings += localMooringEarnings + localUnmooringEarnings + foreignMooringEarnings + foreignUnmooringEarnings;
    totalSSS += parseFloat(row.sss) || 0;
    totalPagibig += parseFloat(row.pagibig) || 0;
    totalPhilhealth += parseFloat(row.philhealth) || 0;
    totalCashAdvance += parseFloat(row.cashAdvance) || 0;
  });
  
  const totalDeductions = totalSSS + totalPagibig + totalPhilhealth + totalCashAdvance;
  const netTotal = totalEarnings - totalDeductions;
  
  return {
    totalEarnings,
    sss: totalSSS,
    pagibig: totalPagibig,
    philhealth: totalPhilhealth,
    cashAdvance: totalCashAdvance,
    totalDeductions,
    netTotal
  };
}

// Format currency
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

// Format date
export function formatDate(date, options = {}) {
  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  
  return new Date(date).toLocaleDateString('en-US', { ...defaultOptions, ...options });
}

// Validate email
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Check if user is manager (Carla)
export function isManager(email) {
  if (!email) return false;
  const managerEmails = ['carla@anchorpoint.com', 'carladelapena@anchorpoint.com'];
  return managerEmails.some(managerEmail => 
    email.toLowerCase().includes(managerEmail.toLowerCase().split('@')[0])
  );
}

// Check if user is approver (Alice)
export function isApprover(email) {
  if (!email) return false;
  const approverEmails = ['alice@anchorpoint.com'];
  return approverEmails.some(approverEmail => 
    email.toLowerCase().includes(approverEmail.toLowerCase().split('@')[0])
  );
}
