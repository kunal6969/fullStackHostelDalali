const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hostel-dalali');

const RoomListing = require('./src/api/models/roomListing.model');

async function fixExistingListings() {
  try {
    console.log('🔧 Connecting to database...');
    
    // Find all listings with the old desiredRoom structure
    const listings = await RoomListing.find({});
    
    console.log(`📝 Found ${listings.length} listings to check`);
    
    for (const listing of listings) {
      // Check if this listing has the old structure (has hostelName property)
      if (listing.desiredRoom && listing.desiredRoom.hostelName !== undefined) {
        console.log(`🔄 Updating listing: ${listing._id} - ${listing.title}`);
        
        // Update to new structure
        listing.desiredRoom = {
          preferredHostels: [],
          preferredRoomTypes: [],
          preferredFloors: [],
          amenityPreferences: [],
          maxBudget: 0
        };
        
        await listing.save();
        console.log(`✅ Updated listing: ${listing._id}`);
      } else {
        console.log(`✅ Listing already has correct structure: ${listing._id}`);
      }
    }
    
    console.log('🎉 All listings updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating listings:', error);
    process.exit(1);
  }
}

fixExistingListings();
