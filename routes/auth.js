const express = require("express");
const router = express.Router();
const User = require("../models/user");
const authController = require("../controllers/auth");

const { body } = require("express-validator");

router.put(
  "/signup",
  [
    body("email")
      .isEmail()
      .withMessage("Please enter a valid email")
      .custom((value, { req }) => {
        return User.findOne({ email: value }).then((userDocument) => {
          if (userDocument) {
            return Promise.reject("Email address already exists");
          }
        });
      })
      .normalizeEmail(),
    body("password").trim().isLength({ min: 5 }),
    body("name").trim().not().isEmpty(),
  ],
  authController.signUp
);

router.post("/login", authController.login);

module.exports = router;
