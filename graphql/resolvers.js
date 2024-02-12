const User = require("../models/user");
const bcrypt = require("bcryptjs");
const validator = require("validator");
const { isEmail, isEmpty, isLength } = validator;

module.exports = {
  createUser: async function (args, req) {
    const errors = [];
    const { email, name, password } = args.userInput;
    //validation logic
    if (!isEmail(email)) {
      errors.push({ message: "email is invalid" });
    }
    if (isEmpty(password) || !isLength(password, { min: 5 })) {
      errors.push({ message: "Password to0 short" });
    }
    if (errors.length > 0) {
      const error = new Error("Invalid input");
      error.data = errors;
      error.code = 422;
      throw error;
    }

    const existingUser = await User.findOne({ email: email });
    if (existingUser) {
      const error = new Error("User already exists");
      throw error;
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new User({
      email: email,
      name: name,
      password: hashedPassword,
    });
    const createdUser = await user.save();
    return {
      ...createdUser._doc,
      _id: createdUser._id.toString(),
    };
  },
};
