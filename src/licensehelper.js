/* Exported functions. */
module.exports = {
  formatPlate: formatPlate
};

module.exports.StatesAndProvinces = [
  "AL",
  "AK",
  "AS",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "DC",
  "FM",
  "FL",
  "GA",
  "GU",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MH",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "MP",
  "OH",
  "OK",
  "OR",
  "PW",
  "PA",
  "PR",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VI",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
  "AB",
  "BC",
  "MB",
  "NB",
  "NL",
  "NT",
  "NS",
  "NU",
  "ON",
  "PE",
  "QC",
  "SK",
  "YT"
];

/**
 * When displaying a license we should not use XX:nnnnn especially since when
 * putting a # in front, it means all our tweets will show up in "yay state XX" hashtag queries.
 * Also it protects from someone copying/pasting or retweeting or something and having the bot
 * detect it as another request.
**/
  function formatPlate(license) {
    return license.toUpperCase().replace(':', '_');
  }

