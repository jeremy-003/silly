//  OpenShift sample Node application
var express = require('express'),
    app     = express(),
    morgan  = require('morgan');
    
Object.assign=require('object-assign')

app.engine('html', require('ejs').renderFile);
app.use(morgan('combined'))

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
    ip   = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0',
    mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL,
    mongoURLLabel = "";

if (mongoURL == null) {
  var mongoHost, mongoPort, mongoDatabase, mongoPassword, mongoUser;
  // If using plane old env vars via service discovery
  if (process.env.DATABASE_SERVICE_NAME) {
    var mongoServiceName = process.env.DATABASE_SERVICE_NAME.toUpperCase();
    mongoHost = process.env[mongoServiceName + '_SERVICE_HOST'];
    mongoPort = process.env[mongoServiceName + '_SERVICE_PORT'];
    mongoDatabase = process.env[mongoServiceName + '_DATABASE'];
    mongoPassword = process.env[mongoServiceName + '_PASSWORD'];
    mongoUser = process.env[mongoServiceName + '_USER'];

  // If using env vars from secret from service binding  
  } else if (process.env.database_name) {
    mongoDatabase = process.env.database_name;
    mongoPassword = process.env.password;
    mongoUser = process.env.username;
    var mongoUriParts = process.env.uri && process.env.uri.split("//");
    if (mongoUriParts.length == 2) {
      mongoUriParts = mongoUriParts[1].split(":");
      if (mongoUriParts && mongoUriParts.length == 2) {
        mongoHost = mongoUriParts[0];
        mongoPort = mongoUriParts[1];
      }
    }
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
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    var col = db.collection('counts');
    // Create a document with request IP and current time of request
    col.insert({ip: req.ip, date: Date.now()});
    col.count(function(err, count){
      if (err) {
        console.log('Error running count. Message:\n'+err);
      }
      res.render('index.html', { pageCountMessage : count, dbInfo: dbDetails });
    });
  } else {
    res.render('index.html', { pageCountMessage : null});
  }
});

app.get('/pagecount', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    db.collection('counts').count(function(err, count ){
      res.send('{ pageCount: ' + count + '}');
    });
  } else {
    res.send('{ pageCount: -1 }');
  }
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
