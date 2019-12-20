// Express handles routing and other middleware
var express = require('express'),
    app     = express();
    
//Object.assign=require('object-assign')

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
    ip   = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0',
    mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL,
    mongoURLLabel = "";

if (mongoURL == null) {
  var mongoHost, mongoPort, mongoDatabase, mongoPassword, mongoUser;
  // Using env vars via service discovery for the Mongo database information
  if (process.env.DATABASE_SERVICE_NAME) {
    var mongoServiceName = process.env.DATABASE_SERVICE_NAME.toUpperCase();
    mongoHost = process.env[mongoServiceName + '_SERVICE_HOST'];
    mongoPort = process.env[mongoServiceName + '_SERVICE_PORT'];
    mongoDatabase = process.env[mongoServiceName + '_DATABASE'];
    mongoPassword = process.env[mongoServiceName + '_PASSWORD'];
    mongoUser = process.env[mongoServiceName + '_USER'];
  }

  if (mongoHost && mongoPort && mongoDatabase) {
    mongoURLLabel = mongoURL = 'mongodb://';
    if (mongoUser && mongoPassword) {
      mongoURL += mongoUser + ':' + mongoPassword + '@';
    }
    // Provide UI label that excludes user id and pw
    mongoURLLabel += mongoHost + ':' + mongoPort + '/' + mongoDatabase;
    mongoURL += mongoHost + ':' +  mongoPort + '/' + mongoDatabase;
  }
}

// This checks to see if mongoURL is still undefined so that we know to use the localhost information
if (mongoURL === undefined) {
  ip = '127.0.0.1'; // used IP instead of localhost because localhost did not work right on my local machine.
  port = 3000;
  mongoURLLabel = mongoURL = 'mongodb://localhost:27017/sampledb';
}

var db = null,
    dbDetails = new Object();

var initDb = function(callback) {
  if (mongoURL == null) return;

  var mongodb = require('mongodb');
  if (mongodb == null) return;

  mongodb.connect(mongoURL, function(err, conn) {
    if (err) {
      callback(err);
      return;
    }

    db = conn;
    dbDetails.databaseName = db.databaseName;
    dbDetails.url = mongoURLLabel;
    dbDetails.type = 'MongoDB';

    console.log('Connected to MongoDB at: %s', mongoURL);
  });
};

// body-parser handles parsing of request bodies
const bodyParser = require('body-parser');
app.use(bodyParser.json());

// Validators
// N.B. loginUrl is not a required field
function isValidFullMySite(inMySite) {
  if (!inMySite.hasOwnProperty('siteUrl')) { return false; }
  if (!inMySite.hasOwnProperty('cmsType')) { return false; }
  if (!inMySite.hasOwnProperty('dataSource')) { return false; }
  if (!inMySite.hasOwnProperty('dataTimestamp')) { return false; }
  if (!inMySite.hasOwnProperty('brand')) { return false; }
  if (!inMySite.hasOwnProperty('userId')) { return false; }
  return true;
}

function isValidPartialMySite(inMySite) {
  if (inMySite.hasOwnProperty('siteUrl')) { return true; }
  if (inMySite.hasOwnProperty('cmsType')) { return true; }
  if (inMySite.hasOwnProperty('dataSource')) { return true; }
  if (inMySite.hasOwnProperty('dataTimestamp')) { return true; }
  if (inMySite.hasOwnProperty('brand')) { return true; }
  if (inMySite.hasOwnProperty('userId')) { return true; }
  return false;
}

///////////////////////
///////Endpoints///////
///////////////////////

app.get('/', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  res.status(200).json({ message: "Working" });
});

// error handling
app.use(function(err, req, res, next){
  console.error(err.stack);
  res.status(500).send('Something bad happened!');
});

initDb(function(err){
  console.log('Error connecting to Mongo. Message:\n'+err);
});

// New code from sherlock into the example
//
// POST - MySite
app.post('/mySites', (req, res) => {
  if (!isValidFullMySite(req.body)) {
      res.status(400).send();
      return;
  }
  db.collection('mySite').insertOne(req.body, (err, results) => {
      if (err) {
          res.status(500).json(err.message);
      } else {
          res.json(results);
      }
})});

// GET (list) - MySite
app.get('/mySites', (req, res) => {
  db.collection('mySite').find({}).toArray((err, results) => {
      if (err) {
          res.json(err.message);
      } else {
          res.json(results);
      }
})});

// GET (detail) - MySite
app.get('/mySites/:siteUrl', (req, res) => {
  let filter = {'siteUrl': req.params.siteUrl};
  db.collection('mySite').findOne(filter, (err, results) => {
      if (err) {
          res.json(err.message);
      } else {
          res.json(results);
      }
})});

// PUT - MySite
app.put('/mySites/:siteUrl', (req, res) => {
  if (!isValidPartialMySite(req)) {
      res.status(400).send();
  }
  let filter = {'siteUrl': req.params.siteUrl};
  let update = {$set: req.body};
  db.collection('mySite').updateOne(filter, update, (err, results) => {
      if (err) {
          res.status(500).json(err.message);
      } else {
          res.json(results);
      }
})});

// DELETE - MySite
app.delete('/mySites/:siteUrl', (req, res) => {
  let filter = {"siteUrl": req.params.siteUrl};
  db.collection('mySite').deleteOne(filter, (err, results) => {
      if (err) {
          res.status(500).json(err.message);
      } else {
          res.json(results);
      }
})});

// MySites By UserId + Brand
// GET (list)
app.get('/mySitesByUser/:brand/:userId', (req, res) => {
  let filter = {
      brand: req.params.brand,
      userId: req.params.userId
  };
  db.collection('mySite').find(filter).toArray((err, results) => {
      if (err) {
          res.status(500).json(err.message);
      } else {
          res.json(results);
      }
})});

// DELETE
app.delete('/mySitesByUser/:brand/:userId', (req, res) => {
  let filter = {
      brand: req.params.brand,
      userId: req.params.userId
  };
  db.collection('mySite').deleteMany(filter, (err, results) => {
      if (err) {
          res.status(500).json(err.message);
      } else {
          res.json(results);
      }
})});
//
//

app.listen(port, ip);
console.log('Server running on http://%s:%s', ip, port);

//module.exports = app ;
