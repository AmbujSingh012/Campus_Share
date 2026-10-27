const express = require("express");
const multer = require("multer");
const { Readable } = require("stream");
const db = require("../db");
const authenticateToken = require("../middleware/authMiddleware");
const cloudinary = require("../cloudinary");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png"];

    if (allowedTypes.includes(file.mimetype)) {
      return cb(null, true);
    }

    cb(new Error("Only JPG and PNG images are allowed"));
  },
});

function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "campusshare/profile-photos",
        resource_type: "image",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    Readable.from(buffer).pipe(stream);
  });
}

router.post(
  "/",
  authenticateToken,
  upload.single("photo"),
  async (req, res) => {
    try {
      const userId = Number(req.user?.userId);

      if (!Number.isSafeInteger(userId) || userId <= 0) {
        return res.status(401).json({
          success: false,
          message: "Please log in again.",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Please select a JPG or PNG photo.",
        });
      }

      const uploaded = await uploadToCloudinary(req.file.buffer);

      await db.execute(
        "UPDATE users SET profile_picture = ? WHERE id = ?",
        [uploaded.secure_url, userId]
      );

      return res.json({
        success: true,
        message: "Profile photo updated successfully.",
        profilePicture: uploaded.secure_url,
      });
    } catch (error) {
      console.error("Profile photo upload error:", error.message);

      return res.status(500).json({
        success: false,
        message: "Unable to upload profile photo.",
      });
    }
  }
);

module.exports = router;
