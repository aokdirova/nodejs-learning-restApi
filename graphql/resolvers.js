const User = require("../models/user");
const Post = require("../models/post");
const bcrypt = require("bcryptjs");
const validator = require("validator");
const { isEmail, isEmpty, isLength } = validator;
const jwt = require("jsonwebtoken");

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
  login: async function ({ email, password }) {
    const user = await User.findOne({ email: email });
    if (!user) {
      const error = new Error("User not found");
      error.code = 401;
      throw error;
    }
    const passwordIsEqual = await bcrypt.compare(password, user.password);
    if (!passwordIsEqual) {
      const error = new Error("Password is incorrect");
      error.code = 401;
      throw error;
    }
    const token = jwt.sign(
      {
        email: user.email,
        userId: user._id.toString(),
      },
      "secretysecretkey",
      { expiresIn: "1h" }
    );
    return {
      token: token,
      userId: user._id.toString(),
    };
  },
  createPost: async function ({ postInput }, req) {
    const { title, content, imageUrl } = postInput;
    const errors = [];
    if (isEmpty(title) || isLength(title, { min: 5 })) {
      errors.push({ message: "Title is invalid" });
    }
    if (isEmpty(content) || isLength(content, { min: 5 })) {
      errors.push({ message: "Content is invalid" });
    }
    if (errors.length > 0) {
      const error = new Error("Invalid input");
      error.data = errors;
      error.code = 422;
      throw error;
    }
    const post = new Post({
      title,
      content,
      imageUrl,
    });
    const createdPost = await post.save();
    //add post to users' posts
    return {
      ...createdPost._doc,
      _id: createdPost._id.toString(),
      createdAt: createdPost.createdAt.toISOString(),
      updatedAt: createdPost.updatedAt.toISOString(),
    };
  },
};
