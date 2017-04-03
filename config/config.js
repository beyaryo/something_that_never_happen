module.exports = {
  database: process.env.MONGO_URI || 'localhost:26124/sampledb',
  // database: process.env.MONGO_URI || 'mongodb://beyaryo:initakumanatamu@ds147070.mlab.com:47070/ta',
  hostedServerUrl: "https://myfis.herokuapp.com/",
  firebaseServerKey: "AIzaSyCVRDZQRhLADH1EJrhVhumaN_N_TS3vTEc",
  firebaseService: "/config/myfiv-d9c0e-firebase-adminsdk-1h5ug-731c8c6478.json",
  firebaseDatabaseUrl: "https://myfiv-d9c0e.firebaseio.com/"
};

// mongoose.connect('mongodb://ted:ted@ds061797.mongolab.com:61797/theenlighteneddeveloper', function (error) {
//     if (error) {
//         console.log(error);
//     }
// });