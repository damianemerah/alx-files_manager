const Queue = require('bull');
const imageThumbnail = require('image-thumbnail');
const fs = require('fs');
const path = require('path');
const DBClient = require('./utils/db');
const db = new DBClient();

// Create a Bull queue
const fileQueue = new Queue('fileQueue');

// Process the queue
fileQueue.process(async (job) => {
  const { userId, fileId } = job.data;

  if (!fileId) {
    throw new Error('Missing fileId');
  }

  if (!userId) {
    throw new Error('Missing userId');
  }

  // Find the file document in the database
  const file = await db.files.findOne({
    _id: ObjectId(fileId),
    userId: ObjectId(userId),
  });

  if (!file) {
    throw new Error('File not found');
  }

  // Generate thumbnails with different sizes
  const sizes = [500, 250, 100];

  for (const size of sizes) {
    const thumbnailData = await imageThumbnail(file.localPath, {
      width: size,
    });

    // Save the thumbnail with the appropriate name
    const thumbnailPath = file.localPath.replace(
      path.extname(file.localPath),
      `_${size}${path.extname(file.localPath)}`
    );

    await fs.promises.writeFile(thumbnailPath, thumbnailData);
  }
});
