const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const multer = require("multer");
const { graphqlHTTP } = require("express-graphql");
const graphqlSchema = require("./graphql/schema");
const resolver = require("./graphql/resolvers");

const feedRoutes = require("./routes/feed");
const authRoutes = require("./routes/auth");

const auth = require("./middleware/auth");

const app = express();

const deleteFile = (filePath) => {
  const constructedPath = path.join(__dirname, "..", filePath);
  fs.unlink(constructedPath, (err) => console.log(err));
};

////////////////////////////////////////////////////////////////

function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    cb(null, getRandomNumber(0, 1001) + "-" + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  const mimeType = file.mimetype;
  if (
    mimeType === "image/png" ||
    mimeType === "image/jpg" ||
    mimeType === "image/jpeg"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

////////////////////////////////////////////////////////////////////////////

app.use(cors());
app.options("*", cors());

// app.use((req, res, next) => {
//   res.setHeader("Access-Control-Allow-Origin", "*");
//   res.setHeader("Acces-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE");
//   res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
//   if (req.method === "OPTIONS") {
//     return res.sendStatus(200);
//   }
//   next();
// });

app.use(bodyParser.json());
app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single("image")
);
app.use("/images", express.static(path.join(__dirname, "images")));
app.use(auth);

app.put("/post-image", (req, res, next) => {
  if (!req.isAuth) {
    throw new Error("Not authenticated");
  }
  if (!req.file) {
    return res.status(200).json({ message: "No file provided" });
  }
  if (req.body.oldPath) {
    deleteFile(req.body.oldPath);
  }
  return res
    .status(201)
    .json({ message: "File stored", filePath: req.file.path });
});

// app.use("/feed", feedRoutes);
// app.use("/auth", authRoutes);

app.use(
  "/graphql",
  graphqlHTTP({
    schema: graphqlSchema,
    rootValue: resolver,
    graphiql: true,
    customFormatErrorFn(err) {
      if (!err.originalError) {
        return err;
      }
      const data = err.originalError.data;
      const message = err.message || "an error occured";
      const statusCode = err.originalError.code || 500;
      return { message, statusCode, data };
    },
  })
);

app.use((error, req, res, next) => {
  const status = error.statusCode || 500;
  const message = error.message || "An error occured";
  const data = error.data;
  res.status(status).json({ message: message, data: data });
});

mongoose
  .connect(process.env.MONGO_DB_URL)
  .then(() => {
    app.listen(8080);
  })
  .catch((err) => console.log(err));
