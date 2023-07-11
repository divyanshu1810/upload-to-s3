const express = require("express");
const dotenv = require("dotenv");
dotenv.config();
const AWS = require("aws-sdk");
const multer = require("multer");

const awsConfig = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
};

const S3 = new AWS.S3(awsConfig);
const PORT = process.env.PORT || 3000;

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let upload = multer({
  limits: 1024 * 1024 * 5,
  fileFilter: function (req, file, done) {
    if (
      file.mimetype === "image/jpeg" ||
      file.mimetype === "image/png" ||
      file.mimetype === "image/jpg"
    ) {
      done(null, true);
    } else {
      done("Multer Error: file type is not supported", false);
    }
  },
});

const uploadToS3 = (fileData) => {
  return new Promise((resolve, reject) => {
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: `${Date.now().toString()}.jpg`,
      Body: fileData,
    };
    S3.upload(params, (error, data) => {
      if (error) {
        console.log(error);
        return reject(error);
      } else {
        console.log(data);
        return resolve(data);
      }
    });
  });
};

app.post("/upload", upload.single("image"), (req, res) => {
  console.log(req.file);
  if (req.file) {
    uploadToS3(req.file.buffer)
      .then((result) => {
        res.status(200).send({
          success: true,
          message: "uploaded succesfully",
          imageURL: result.Location,
          bucket: result.Bucket,
        });
      })
      .catch((error) => {
        res.status(500).send({
          success: false,
          message: "something went wrong",
          error: error,
        });
      });
  }
});

app.post("/uploads", upload.array("images", 3), (req, res) => {
  console.log(req.files);
  if (req.files && req.files.length > 0) {
    for (let i = 0; i < req.files.length; i++) {
      uploadToS3(req.files[i].buffer)
        .then((result) => {
          console.log({ imageURL: result.Location, bucket: result.Bucket });
        })
        .catch((error) => {
          console.log(error);
        });
    }
    res.status(200).send({
      success: true,
      message: `${req.files.length} files uploaded succesfully`,
    });
  } else {
    res.status(500).send({
      success: false,
      message: "something went wrong",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
