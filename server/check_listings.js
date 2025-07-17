const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/hostel-dalali').then(async () => {
  // Check the roomlistings collection directly
  const count = await mongoose.connection.db.collection('roomlistings').countDocuments();
  console.log(`=== Found ${count} documents in roomlistings collection ===`);
  
  if (count > 0) {
    const docs = await mongoose.connection.db.collection('roomlistings').find({}).toArray();
    
    docs.forEach((doc, index) => {
      console.log(`\n${index + 1}. Listing: ${doc.title}`);
      console.log(`   ID: ${doc._id}`);
      console.log(`   Is Active: ${doc.isActive}`);
      console.log(`   Available Till: ${doc.availableTill}`);
      console.log(`   Current Time: ${new Date().toISOString()}`);
      console.log(`   Expired?: ${doc.availableTill ? (new Date(doc.availableTill) < new Date()) : 'No date'}`);
      console.log(`   Gender Preference: ${doc.genderPreference}`);
      console.log(`   Hostel: ${doc.currentRoom?.hostelName}`);
      console.log(`   Room Type: ${doc.currentRoom?.roomType}`);
      console.log(`   Listed By: ${doc.listedBy}`);
    });
    
    // Test the exact same filter as backend
    const backendFilter = {
      isActive: true,
      availableTill: { $gte: new Date() }
    };
    
    const filteredDocs = await mongoose.connection.db.collection('roomlistings').find(backendFilter).toArray();
    console.log(`\n=== Backend Filter Results ===`);
    console.log(`Filter: ${JSON.stringify(backendFilter, null, 2)}`);
    console.log(`Matching documents: ${filteredDocs.length}`);
    
    if (filteredDocs.length > 0) {
      filteredDocs.forEach((doc, index) => {
        console.log(`${index + 1}. ${doc.title} (Active: ${doc.isActive}, Till: ${doc.availableTill})`);
      });
    }
  }
  
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
