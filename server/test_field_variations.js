// Test script to verify field normalization works for both variations
const variations = [
  // Variation 1: hostelName/roomType (correct format)
  {
    hostelName: "HL-1",
    roomNumber: "101", 
    block: "A",
    roomType: "Single",
    floor: 2
  },
  
  // Variation 2: hostel/type (alternative format) 
  {
    hostel: "HL-5 (Girls)",
    roomNumber: "123",
    block: "B", 
    type: "Double Shared",
    floor: 3
  }
];

console.log('Testing field normalization logic:');

variations.forEach((roomDetails, index) => {
  console.log(`\n--- Variation ${index + 1} ---`);
  console.log('Input:', roomDetails);
  
  // Apply same normalization logic as backend
  const normalized = {
    hostelName: roomDetails?.hostelName || roomDetails?.hostel || '',
    roomNumber: roomDetails?.roomNumber || '',
    block: roomDetails?.block || '', 
    roomType: roomDetails?.roomType || roomDetails?.type || '',
    floor: roomDetails?.floor || 1,
    amenities: roomDetails?.amenities || [],
    rent: roomDetails?.rent || 0
  };
  
  console.log('Normalized:', normalized);
  
  // Check if required fields are present
  const missingFields = [];
  if (!normalized.hostelName) missingFields.push('hostelName');
  if (!normalized.roomNumber) missingFields.push('roomNumber');
  if (!normalized.block) missingFields.push('block');
  if (!normalized.roomType) missingFields.push('roomType');
  
  console.log('Missing fields:', missingFields.length > 0 ? missingFields : 'None');
  console.log('Validation result:', missingFields.length === 0 ? '✅ PASS' : '❌ FAIL');
});
