const seattle = require(__dirname + '/src/seattle.js');

console.log(`Seattle module loaded.`);

module.exports = {
  GetCitationsByPlate: seattle.GetCitationsByPlate,
  ProcessCitationsForRequest: seattle.ProcessCitationsForRequest
}