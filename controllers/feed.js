const { validationResult } = require("express-validator");

const Post = require("../models/post");

const fs = require("fs");
const path = require("path");

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

exports.getPosts = (req, res, next) => {
  const currentPage = req.query.page || 1;
  const postsPerPage = 2;
  let totalItems;

  Post.countDocuments()
    .then((items) => {
      if (!items) {
        errorWithMessage("no posts found", 404);
      }
      totalItems = items;
      return Post.find()
        .skip((currentPage - 1) * postsPerPage)
        .limit(postsPerPage);
    })
    .then((posts) => {
      if (!posts) {
        errorWithMessage("No posts found", 404);
      }
      res.status(200).json({
        message: "Fetched posts successfully",
        posts: posts,
        totalItems: totalItems,
      });
    })
    .catch((err) => errorHandling(err, next));
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
  //create post in db
  const post = new Post({
    title: title,
    content: content,
    imageUrl: imageUrl,
    creator: { name: "A" },
  });
  post
    .save()
    .then((result) => {
      res.status(201).json({
        message: "post created successfully",
        post: result,
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
  console.log(req.body);
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
    .then((post) => {
      if (!post) {
        errorWithMessage("Could not find post!", 404);
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
      deleteFile(post.imageUrl);
      return Post.findByIdAndDelete(postId);
    })
    .then((result) => {
      res.status(200).json({ message: "Deleted successfully" });
    })
    .catch((err) => errorHandling(err, next));
};
