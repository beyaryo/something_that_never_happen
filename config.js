module.exports = {
  database: process.env.MONGO_URI || 'localhost:26124/sampledb',
  hostedServerUrl: "https://myfis.herokuapp.com/"
};

// mongoose.connect('mongodb://ted:ted@ds061797.mongolab.com:61797/theenlighteneddeveloper', function (error) {
//     if (error) {
//         console.log(error);
//     }
// });