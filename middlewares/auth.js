const jwt = require("jsonwebtoken");
const signature = require("../config/keys").jwtSecret;
const ServerError = require("../Class/ServerError");

const unknownErrorMessage = "Unknown error has occurred";
const unknownErrorCode = "UNKNOWN_ERROR";

module.exports = function (req, res, next) {
  try {
    var token = req.headers["authorization"].split("Bearer ")[1];
  } catch (e) {
    res.status(404).send({ message: "No Authorization header", code: "UNAUTHORIZED_REQUEST" });
  }

  try {
    const decoded = jwt.verify(token, signature);
    req.user = decoded.data;
    next();
  } catch (err) {
    res
      .status(400)
      .send({ message: unknownErrorMessage, code: unknownErrorCode });
  }
};
