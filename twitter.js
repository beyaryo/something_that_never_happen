/**
 * Import config file
 */
var config = require('./config/config');

// var Twitter = require('twitter');
// var twClient = new Twitter({
//     consumer_key: 'JfZQjZHZI3omYnJhe4TjP2SEC',
//     consumer_secret: 'hGPWqfzWWODVy7jLgRawkPt7xTDiMmBYwFRDXWytWli2SCAQ7s',
//     access_token_key: '1956431468-FR8X4nisNxn8aQtyalepiL148NUHk6EI0fgQ6ZA',
//     access_token_secret: 'JEVY10gbIzaF2WTPdbUapva66VA8fY2wJZHqKB4EM3Iv1'
// });
var twClient = new (require('twitter'))({
    consumer_key: config.twitterConsumerKey,
    consumer_secret: config.twitterConsumerSecret,
    access_token_key: config.twitterAccessTokenKey,
    access_token_secret: config.twitterAccessTokenSecret
});

twClient.post('statuses/update', {status: 'Test twitter npm!'},  function(error, tweet, response) {
  if(error) {
      console.log(error);
      return;
    }
  console.log(tweet);  // Tweet body. 
  console.log(response);  // Raw response object. 
});