// Picks the real `mongoose` package when MONGO_URI is configured (a real
// MongoDB/Atlas cluster), otherwise falls back to the embedded pure-JS store
// in ./miniMongoose.js. Model files only ever talk to this module, so neither
// they nor the controllers need to know which backend is active.
module.exports = process.env.MONGO_URI ? require('mongoose') : require('./miniMongoose');
