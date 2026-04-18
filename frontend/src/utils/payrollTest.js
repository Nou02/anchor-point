// Test utility for payroll access control
// This file can be used to test the Alice Santos detection logic

export const testPayrollAccess = (userName, userEmail, userRole) => {
  const aliceName = 'Alice Margaretha Santos';
  const userNameLower = userName.toLowerCase();
  const userEmailLower = userEmail.toLowerCase();
  
  console.log('🧪 Testing Payroll Access Control');
  console.log('User Name:', userName);
  console.log('User Email:', userEmail);
  console.log('User Role:', userRole);
  
  // Check for exact name match first
  if (userName === aliceName) {
    console.log(' Exact name match found for Alice');
    return { hasAccess: true, reason: 'Exact name match' };
  }
  
  // Check for role-based access
  if (userRole && (userRole.toLowerCase() === 'senior supervisor' || 
                   userRole.toLowerCase() === 'admin' || 
                   userRole.toLowerCase() === 'manager')) {
    console.log(' Role-based access granted:', userRole);
    return { hasAccess: true, reason: `Role-based access: ${userRole}` };
  }
  
  // Check for partial name matches
  const nameContainsAlice = userNameLower.includes('alice');
  const nameContainsMargaretha = userNameLower.includes('margaretha');
  const nameContainsSantos = userNameLower.includes('santos');
  const emailContainsAlice = userEmailLower.includes('alice');
  
  const isAliceUser = (
    nameContainsAlice ||
    nameContainsMargaretha ||
    nameContainsSantos ||
    emailContainsAlice ||
    userEmailLower.includes('alice.margaretha') ||
    userEmailLower.includes('alice_margaretha') ||
    userEmailLower.includes('alice.santos') ||
    userEmailLower.includes('alice_santos')
  );
  
  console.log(' Partial match results:');
  console.log('  - Contains "alice":', nameContainsAlice);
  console.log('  - Contains "margaretha":', nameContainsMargaretha);
  console.log('  - Contains "santos":', nameContainsSantos);
  console.log('  - Email contains "alice":', emailContainsAlice);
  
  if (isAliceUser) {
    console.log(' Partial match access granted');
    return { hasAccess: true, reason: 'Partial name/email match' };
  }
  
  console.log(' No access granted - regular worker view');
  return { hasAccess: false, reason: 'No matching criteria' };
};

// Test cases
export const runPayrollTests = () => {
  console.log('🧪 Running Payroll Access Control Tests');
  console.log('=====================================');
  
  const testCases = [
    {
      name: 'Alice Santos - Exact Match',
      userName: 'Alice Margaretha Santos',
      userEmail: 'alice@test.com',
      userRole: 'Worker'
    },
    {
      name: 'Alice Santos - Role Based',
      userName: 'Alice Santos',
      userEmail: 'alice@test.com',
      userRole: 'Senior Supervisor'
    },
    {
      name: 'Alice - First Name Only',
      userName: 'Alice',
      userEmail: 'alice@test.com',
      userRole: 'Worker'
    },
    {
      name: 'Alice Email Match',
      userName: 'John Doe',
      userEmail: 'alice.santos@test.com',
      userRole: 'Worker'
    },
    {
      name: 'Regular Worker',
      userName: 'Bryan Matthew Cruz',
      userEmail: 'bryan@test.com',
      userRole: 'Dock Worker'
    },
    {
      name: 'Manager Role',
      userName: 'John Manager',
      userEmail: 'manager@test.com',
      userRole: 'Manager'
    }
  ];
  
  testCases.forEach((testCase, index) => {
    console.log(`\n Test ${index + 1}: ${testCase.name}`);
    const result = testPayrollAccess(testCase.userName, testCase.userEmail, testCase.userRole);
    console.log(`Result: ${result.hasAccess ? ' ACCESS GRANTED' : ' ACCESS DENIED'} - ${result.reason}`);
  });
  
  console.log('\n🧪 Payroll Access Control Tests Complete');
};

// Export for use in development
if (process.env.NODE_ENV === 'development') {
  window.testPayrollAccess = testPayrollAccess;
  window.runPayrollTests = runPayrollTests;
} 