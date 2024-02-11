const { validationResult } = require("express-validator");

const Post = require("../models/post");
const User = require("../models/user");

const fs = require("fs");
const path = require("path");

const io = require("../socket");
const user = require("../models/user");

const errorHandling = (err, next) => {
  if (!err.statusCode) {
    err.statusCode = 500;
  }
  console.log(err);
  next(err);
};

const errorWithMessage = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

///////////////////////////////////////////////

exports.getPosts = async (req, res, next) => {
  //used async await in this controller
  const currentPage = req.query.page || 1;
  const postsPerPage = 2;
  try {
    const totalItems = await Post.find().countDocuments();
    if (totalItems) {
      const posts = await Post.find()
        .populate("creator")
        .sort({ createdAt: -1 })
        .skip((currentPage - 1) * postsPerPage)
        .limit(postsPerPage);
      if (!posts) {
        errorWithMessage("No posts found", 404);
      }
      res.status(200).json({
        message: "Fetched posts successfully",
        posts: posts,
        totalItems: totalItems,
      });
    }
  } catch (err) {
    errorHandling(err, next);
  }
};

exports.createPost = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    errorWithMessage("Validation error", 422);
  }
  if (!req.file) {
    errorWithMessage("No image provided", 422);
  }
  const imageUrl = req.file.path;
  const title = req.body.title;
  const content = req.body.content;
  let creator;
  //create post in db
  const post = new Post({
    title: title,
    content: content,
    imageUrl: imageUrl,
    creator: req.userId,
  });
  post
    .save()
    .then(() => {
      return User.findById(req.userId);
    })
    .then((user) => {
      creator = user;
      user.posts.push(post);
      return user.save();
    })
    .then((result) => {
      io.getIO().emit("posts", {
        action: "create",
        post: { ...post._doc, creator: { _id: req.userId, name: user.name } },
      });
      res.status(200).json({
        message: "Post created successfully",
        post: post,
        creator: { _id: creator._id, name: creator.name },
      });
    })
    .catch((err) => {
      errorHandling(err, next);
    });
};

exports.getSinglePost = (req, res, next) => {
  const postId = req.params.postId;
  Post.findById(postId)
    .then((post) => {
      if (!post) {
        errorWithMessage("Could not find post", 404); //throwing error inside of then block just gives it to the catch block and then it reaches the error handling middleware
      }
      res.status(200).json({ message: "Post fetched", post: post });
    })
    .catch((err) => {
      errorHandling(err, next);
    });
};

const deleteFile = (filePath) => {
  const constructedPath = path.join(__dirname, "..", filePath);
  fs.unlink(constructedPath, (err) => console.log(err));
};

exports.updatePost = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    errorWithMessage("Validation error", 422);
  }
  const postId = req.params.postId;
  const { title, content } = req.body;
  let imageUrl = req.body.image;
  if (req.file) {
    imageUrl = req.file.path;
  }
  if (!imageUrl) {
    errorWithMessage("No file picked", 422);
  }
  Post.findById(postId)
    .populate("creator")
    .then((post) => {
      if (!post) {
        errorWithMessage("Could not find post!", 404);
      }
      if (post.creator._id.toString() !== req.userId) {
        errorWithMessage("Not authorized", 403);
      }
      if (imageUrl !== post.imageUrl) {
        deleteFile(post.imageUrl);
      }
      post.title = title;
      post.imageUrl = imageUrl;
      post.content = content;
      return post.save();
    })
    .then((result) => {
      io.getIO().emit("posts", { action: "update", post: result });
      res.status(200).json({ message: "Post updated", post: result });
    })
    .catch((err) => errorHandling(err, next));
};
exports.deletePost = (req, res, next) => {
  const postId = req.params.postId;
  Post.findById(postId)
    .then((post) => {
      //check if user authorized
      if (!post) {
        errorWithMessage("Could not find post!", 404);
      }
      if (post.creator.toString() !== req.userId) {
        errorWithMessage("Not authorized", 403);
      }
      deleteFile(post.imageUrl);
      return Post.findByIdAndDelete(postId);
    })
    .then((result) => {
      return User.findById(req.userId);
    })
    .then((user) => {
      user.posts.pull(postId);
      return user.save();
    })
    .then(() => {
      io.getIO().emit("posts", { action: "delete", post: postId });
      res.status(200).json({ message: "Deleted successfully" });
    })
    .catch((err) => errorHandling(err, next));
};

exports.getStatus = (req, res, next) => {
  User.findById(req.userId)
    .then((user) => {
      if (!user) {
        errorWithMessage("user not found", 404);
      }
      res.status(200).json({
        message: "Fetched status successfully",
        status: user.status,
      });
    })
    .catch((err) => {
      errorHandling(err, next);
    });
};
exports.updateStatus = (req, res, next) => {
  const newStatus = req.body.status;
  if (!newStatus) {
    errorWithMessage("Status cannot be empty", 422);
  }
  User.findById(req.userId)
    .then((user) => {
      if (!user) {
        errorWithMessage("user not found", 404);
      }
      user.status = newStatus;
      return user.save();
    })
    .then((result) => {
      res.status(200).json({
        message: "updated status successfully",
      });
    })
    .catch((err) => {
      errorHandling(err, next);
    });
};
