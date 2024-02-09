const User = require("../models/user");
const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const JWT = require("jsonwebtoken");

//declared this funcs again just because i am lazy to export and import,  but not lazy to write this long comment smhow

const errorHandling = (err) => {
  if (!err.statusCode) {
    err.statusCode = 500;
  }
  console.log(err);
  next(err);
};

const errorWithMessage = (message, statusCode, errors) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (errors) {
    error.data = errors.array();
  }
  throw error;
};

exports.signUp = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors) {
    errorWithMessage("Validation failer", 422, errors);
  }
  const { email, name, password } = req.body;
  bcrypt
    .hash(password, 12)
    .then((hashedPassword) => {
      const user = new User({
        name: name,
        email: email,
        password: hashedPassword,
      });
      return user.save();
    })
    .then((result) => {
      res.status(201).json({ message: "User created", userId: result._id });
    })
    .catch((err) => errorHandling(err));
};

exports.login = (req, res, next) => {
  const { email, password } = req.body;
  let loadedUser;
  User.findOne({ email: email })
    .then((user) => {
      if (!user) {
        errorWithMessage("No such email found", 401);
      }
      loadedUser = user;
      return bcrypt.compare(password, user.password);
    })
    .then((isEqual) => {
      if (!isEqual) {
        errorWithMessage("Wrong password", 401);
      }
      const token = JWT.sign(
        {
          email: loadedUser.email,
          userId: loadedUser._id.toString(),
        },
        "secretysecretkey",
        { expiresIn: "1h" }
      );
      res.status(200).json({ token: token, userId: loadedUser._id.toString() });
    })
    .catch((err) => errorHandling(err));
};
