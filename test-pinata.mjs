import { PinataSDK } from 'pinata';

const pinata = new PinataSDK({
  pinataJwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJkY2VjNzcxYy0wODI0LTRhNjgtYTlkYi04YmQ2MTRhNWVkNzgiLCJpYXQiOjE3NDc5NjUyMjUsImV4cCI6MTc3OTUwMTMyNX0.4srJJMhSb-LHb1JIbGfdqmXNN1aVW0hk0J3MWgNMJkU',
  pinataGateway: 'green-obvious-fly-685.mypinata.cloud',
});

// Explore the full SDK structure
console.log('pinata keys:', Object.keys(pinata));
console.log('pinata.upload keys:', Object.keys(pinata.upload));
console.log('pinata.upload.public keys:', Object.keys(pinata.upload.public));
console.log('pinata.upload.private keys:', Object.keys(pinata.upload.private));
console.log('pinata.upload.public.config:', pinata.upload.public.config);
