const express = require("express");
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const keys = require('./config/keys');

require('./models/User');

mongoose.connect(keys.mongoURI);

const app = express();
app.use(bodyParser.json());

require('./routes/authRoutes')(app);
require('./routes/userRoutes')(app);
require('./routes/teamRoutes')(app);


app.get('/', (req, res) => res.send('Hello World'));

if (process.env.NODE_ENV === "production") {
  app.use(express.static("client/build"));
  const path = require("path");
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "client", "build", "index.html"));
  });
}

const PORT = process.env.PORT || 5050;
app.listen(PORT);

module.exports = app;