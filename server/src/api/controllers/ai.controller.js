const axios = require('axios');
const User = require('../models/user.model');
const RoomListing = require('../models/roomListing.model');
const ApiError = require('../../utils/apiError');
const ApiResponse = require('../../utils/apiResponse');
const { GEMINI_API_KEY } = require('../../utils/constants');

// Get AI suggestions for room exchange
const getAISuggestions = async (req, res, next) => {
  try {
    console.log(`📝 [AI-SUGGESTIONS] GET /api/ai/suggestions - Request started`);
    const userId = req.user._id;
    console.log(`📝 [AI-SUGGESTIONS] User ID: ${userId}`);

    if (!GEMINI_API_KEY) {
      console.log(`❌ [AI-SUGGESTIONS] Gemini API key not configured`);
      throw new ApiError(500, 'AI service is not configured');
    }
    console.log(`✅ [AI-SUGGESTIONS] Gemini API key is configured`);

    // Get current user details with room preferences
    console.log(`📝 [AI-SUGGESTIONS] Fetching user details...`);
    const user = await User.findById(userId)
      .select('fullName currentRoom exchangePreferences gender');

    if (!user) {
      console.log(`❌ [AI-SUGGESTIONS] User not found: ${userId}`);
      throw new ApiError(404, 'User not found');
    }

    console.log(`📝 [AI-SUGGESTIONS] User found: ${user.fullName}`);
    console.log(`📝 [AI-SUGGESTIONS] User details:`, {
      gender: user.gender,
      hasCurrentRoom: !!user.currentRoom,
      hasPreferences: !!user.exchangePreferences
    });

    if (!user.currentRoom) {
      console.log(`❌ [AI-SUGGESTIONS] User has no current room details`);
      throw new ApiError(400, 'Please update your current room details to get AI suggestions');
    }

    // Get available room listings that match user's gender
    console.log(`📝 [AI-SUGGESTIONS] Fetching available listings for gender: ${user.gender}`);
    const availableListings = await RoomListing.find({
      genderPreference: { $in: [user.gender, 'Mixed'] },
      isActive: true,
      status: { $in: ['Open', 'Bidding'] },
      listedBy: { $ne: userId }, // Exclude user's own listings
      availableTill: { $gte: new Date() }
    })
    .populate('listedBy', 'fullName currentRoom')
    .limit(20) // Limit to prevent huge prompts
    .lean();

    console.log(`📝 [AI-SUGGESTIONS] Found ${availableListings.length} available listings`);

    // Prepare data for AI
    const userContext = {
      currentRoom: user.currentRoom,
      preferences: user.exchangePreferences,
      gender: user.gender
    };

    console.log(`📝 [AI-SUGGESTIONS] Preparing user context for AI...`);
    console.log(`📝 [AI-SUGGESTIONS] User context:`, {
      currentRoomHostel: user.currentRoom?.hostelName,
      currentRoomType: user.currentRoom?.roomType,
      preferencesSet: !!user.exchangePreferences
    });

    const availableRooms = availableListings.map(listing => ({
      id: listing._id,
      title: listing.title,
      currentRoom: listing.currentRoom,
      desiredRoom: listing.desiredRoom,
      urgency: listing.urgency,
      ownerName: listing.listedBy.fullName,
      interestCount: listing.interestCount,
      tags: listing.tags
    }));

    // Create prompt for Gemini AI
    const prompt = `
You are an AI assistant helping a student find the best room exchange opportunities in a hostel. 
Analyze the user's current situation and preferences against available room listings to provide personalized suggestions.

USER PROFILE:
Current Room: ${JSON.stringify(userContext.currentRoom, null, 2)}
Preferences: ${JSON.stringify(userContext.preferences, null, 2)}
Gender: ${userContext.gender}

AVAILABLE ROOM LISTINGS:
${JSON.stringify(availableRooms, null, 2)}

Please analyze and provide:
1. Top 5 best matches with detailed reasoning
2. Compatibility score (1-10) for each suggestion
3. Specific benefits of each exchange
4. Potential concerns or drawbacks
5. Overall recommendation strategy

Format your response as a JSON object with this structure:
{
  "suggestions": [
    {
      "listingId": "string",
      "title": "string",
      "compatibilityScore": number,
      "reasoning": "string",
      "benefits": ["string"],
      "concerns": ["string"],
      "recommendation": "string"
    }
  ],
  "overallStrategy": "string",
  "additionalTips": ["string"]
}

Focus on practical factors like:
- Hostel preferences match
- Room type compatibility  
- Floor preferences
- Amenity matching
- Budget considerations
- Urgency levels
- Social factors (interest count indicates popularity)

Be specific and helpful in your analysis.
`;

    try {
      // Call Gemini AI API
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
        {
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      if (!response.data.candidates || !response.data.candidates[0]) {
        throw new ApiError(500, 'AI service returned no suggestions');
      }

      const aiResponse = response.data.candidates[0].parts[0].text;
      
      // Try to parse the JSON response
      let aiSuggestions;
      try {
        // Extract JSON from the response (in case there's extra text)
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          aiSuggestions = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        // If JSON parsing fails, create a structured response from the text
        aiSuggestions = {
          suggestions: [],
          overallStrategy: aiResponse.substring(0, 500) + '...',
          additionalTips: ['Please try again for more detailed suggestions']
        };
      }

      // Validate and enrich suggestions with actual listing data
      if (aiSuggestions.suggestions && Array.isArray(aiSuggestions.suggestions)) {
        aiSuggestions.suggestions = aiSuggestions.suggestions
          .filter(suggestion => suggestion.listingId)
          .map(suggestion => {
            const listing = availableListings.find(l => l._id.toString() === suggestion.listingId);
            if (listing) {
              return {
                ...suggestion,
                listing: {
                  _id: listing._id,
                  title: listing.title,
                  currentRoom: listing.currentRoom,
                  desiredRoom: listing.desiredRoom,
                  urgency: listing.urgency,
                  interestCount: listing.interestCount,
                  listedBy: listing.listedBy,
                  createdAt: listing.createdAt
                }
              };
            }
            return suggestion;
          })
          .filter(suggestion => suggestion.listing); // Only include suggestions with valid listings
      }

      res.status(200).json(
        new ApiResponse(200, {
          userContext,
          totalAvailableListings: availableListings.length,
          aiSuggestions
        }, 'AI suggestions generated successfully')
      );

    } catch (aiError) {
      console.error('Gemini API Error:', aiError);
      
      // Fallback: provide basic algorithmic suggestions
      const fallbackSuggestions = generateFallbackSuggestions(userContext, availableListings);
      
      res.status(200).json(
        new ApiResponse(200, {
          userContext,
          totalAvailableListings: availableListings.length,
          suggestions: fallbackSuggestions,
          note: 'AI service temporarily unavailable. Showing algorithmic suggestions.'
        }, 'Fallback suggestions provided')
      );
    }

  } catch (error) {
    next(error);
  }
};

// Fallback suggestion algorithm
const generateFallbackSuggestions = (userContext, availableListings) => {
  const { currentRoom, preferences } = userContext;
  
  return availableListings
    .map(listing => {
      let score = 0;
      const benefits = [];
      const concerns = [];

      // Check hostel preference match
      if (preferences.preferredHostels && preferences.preferredHostels.includes(listing.currentRoom.hostelName)) {
        score += 3;
        benefits.push(`Located in preferred hostel: ${listing.currentRoom.hostelName}`);
      }

      // Check room type preference
      if (preferences.preferredRoomTypes && preferences.preferredRoomTypes.includes(listing.currentRoom.roomType)) {
        score += 2;
        benefits.push(`Matches room type preference: ${listing.currentRoom.roomType}`);
      }

      // Check floor preference
      if (preferences.preferredFloors && preferences.preferredFloors.includes(listing.currentRoom.floor)) {
        score += 1;
        benefits.push(`Located on preferred floor: ${listing.currentRoom.floor}`);
      }

      // Check budget compatibility
      if (preferences.maxBudget && listing.currentRoom.rent <= preferences.maxBudget) {
        score += 1;
        benefits.push(`Within budget: ₹${listing.currentRoom.rent}`);
      } else if (preferences.maxBudget && listing.currentRoom.rent > preferences.maxBudget) {
        concerns.push(`Above budget: ₹${listing.currentRoom.rent} > ₹${preferences.maxBudget}`);
      }

      // Check amenities match
      const matchingAmenities = listing.currentRoom.amenities?.filter(amenity =>
        preferences.amenityPreferences?.includes(amenity)
      ) || [];
      
      if (matchingAmenities.length > 0) {
        score += matchingAmenities.length * 0.5;
        benefits.push(`Matching amenities: ${matchingAmenities.join(', ')}`);
      }

      // Consider urgency
      if (listing.urgency === 'Urgent' || listing.urgency === 'High') {
        score += 0.5;
        benefits.push('High urgency - quick exchange possible');
      }

      // Consider popularity
      if (listing.interestCount > 5) {
        concerns.push('Popular listing - high competition');
      } else if (listing.interestCount === 0) {
        concerns.push('No other interest shown yet');
      }

      // Mutual benefit check
      const userMeetsDesiredCriteria = 
        (!listing.desiredRoom.preferredHostels?.length || 
         listing.desiredRoom.preferredHostels.includes(currentRoom.hostelName)) &&
        (!listing.desiredRoom.preferredRoomTypes?.length || 
         listing.desiredRoom.preferredRoomTypes.includes(currentRoom.roomType)) &&
        (!listing.desiredRoom.preferredFloors?.length || 
         listing.desiredRoom.preferredFloors.includes(currentRoom.floor));

      if (userMeetsDesiredCriteria) {
        score += 2;
        benefits.push('You meet their desired room criteria');
      } else {
        score -= 1;
        concerns.push('May not meet their room preferences');
      }

      return {
        listingId: listing._id,
        title: listing.title,
        compatibilityScore: Math.min(10, Math.max(1, Math.round(score))),
        reasoning: `Based on ${benefits.length} matching factors and ${concerns.length} potential concerns`,
        benefits,
        concerns,
        recommendation: score >= 4 ? 'Highly recommended' : 
                        score >= 2 ? 'Worth considering' : 'Limited compatibility',
        listing: {
          _id: listing._id,
          title: listing.title,
          currentRoom: listing.currentRoom,
          desiredRoom: listing.desiredRoom,
          urgency: listing.urgency,
          interestCount: listing.interestCount,
          listedBy: listing.listedBy
        }
      };
    })
    .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
    .slice(0, 5);
};

// Get AI analysis for a specific listing
const getListingAnalysis = async (req, res, next) => {
  try {
    const { listingId } = req.params;
    const userId = req.user._id;

    if (!GEMINI_API_KEY) {
      throw new ApiError(500, 'AI service is not configured');
    }

    // Get user details
    const user = await User.findById(userId)
      .select('fullName currentRoom exchangePreferences gender');

    if (!user || !user.currentRoom) {
      throw new ApiError(400, 'User or room details not found');
    }

    // Get specific listing
    const listing = await RoomListing.findById(listingId)
      .populate('listedBy', 'fullName currentRoom');

    if (!listing) {
      throw new ApiError(404, 'Listing not found');
    }

    // Create detailed analysis prompt
    const prompt = `
Analyze this specific room exchange opportunity for a student. Provide a detailed compatibility assessment.

USER'S CURRENT SITUATION:
${JSON.stringify({
  currentRoom: user.currentRoom,
  preferences: user.exchangePreferences,
  gender: user.gender
}, null, 2)}

TARGET LISTING:
${JSON.stringify({
  title: listing.title,
  description: listing.description,
  currentRoom: listing.currentRoom,
  desiredRoom: listing.desiredRoom,
  urgency: listing.urgency,
  tags: listing.tags,
  interestCount: listing.interestCount,
  ownerCurrentRoom: listing.listedBy.currentRoom
}, null, 2)}

Provide a detailed analysis including:
1. Compatibility percentage (0-100%)
2. Detailed pros and cons
3. Mutual benefit analysis
4. Negotiation suggestions
5. Risk assessment
6. Timeline considerations
7. Action recommendations

Format as JSON:
{
  "compatibilityPercentage": number,
  "overallAssessment": "string",
  "detailedAnalysis": {
    "locationAnalysis": "string",
    "amenityComparison": "string",
    "mutualBenefit": "string",
    "financialImpact": "string"
  },
  "pros": ["string"],
  "cons": ["string"],
  "riskAssessment": "string",
  "negotiationTips": ["string"],
  "actionPlan": ["string"]
}
`;

    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
        {
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1500,
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      const aiResponse = response.data.candidates[0].parts[0].text;
      
      let analysis;
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found');
        }
      } catch (parseError) {
        analysis = {
          compatibilityPercentage: 50,
          overallAssessment: aiResponse.substring(0, 300) + '...',
          detailedAnalysis: {
            locationAnalysis: 'Analysis in progress...',
            amenityComparison: 'Please try again for detailed comparison',
            mutualBenefit: 'Evaluating mutual benefits...',
            financialImpact: 'Calculating financial implications...'
          },
          pros: ['AI analysis in progress'],
          cons: ['Please retry for detailed analysis'],
          riskAssessment: 'Medium risk',
          negotiationTips: ['Be clear about your requirements'],
          actionPlan: ['Contact the listing owner', 'Discuss exchange details']
        };
      }

      res.status(200).json(
        new ApiResponse(200, {
          listing: {
            _id: listing._id,
            title: listing.title,
            currentRoom: listing.currentRoom,
            desiredRoom: listing.desiredRoom,
            listedBy: listing.listedBy
          },
          userContext: {
            currentRoom: user.currentRoom,
            preferences: user.exchangePreferences
          },
          analysis
        }, 'Listing analysis completed')
      );

    } catch (aiError) {
      console.error('Gemini API Error:', aiError);
      throw new ApiError(500, 'AI analysis service temporarily unavailable');
    }

  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAISuggestions,
  getListingAnalysis
};
