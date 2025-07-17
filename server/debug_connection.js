require('dotenv').config();

console.log('=== Environment Variables Debug ===');
console.log('MONGODB_URI from .env:', process.env.MONGODB_URI);
console.log('Fallback URI:', 'mongodb://localhost:27017/hostel-dalali');

const finalURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hostel-dalali';
console.log('Final URI used:', finalURI);

// Parse the URI to see database name
const url = require('url');
const parsed = url.parse(finalURI);
console.log('Parsed URI:', {
  protocol: parsed.protocol,
  hostname: parsed.hostname,
  port: parsed.port,
  pathname: parsed.pathname,
  database: parsed.pathname?.replace('/', '') || 'NO DATABASE SPECIFIED'
});
