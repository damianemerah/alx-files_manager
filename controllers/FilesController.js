/* eslint-disable import/no-named-as-default */
/* eslint-disable no-unused-vars */
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const { ObjectId } = require('mongodb');
const RedisClient = require('../utils/redis');
const DBClient = require('../utils/db');

const redisClient = new RedisClient();
const db = new DBClient();

class FilesController {
  // Create a new file in the database and on disk
  static async postUpload(req, res) {
    const { name, type, data, parentId, isPublic } = req.body;

    // Retrieve the user based on the token
    const key = `auth_${req.token}`;
    const userId = await redisClient.get(key);

    // If the user is not found, return an error
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check for missing required fields
    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }

    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }

    if (!data && type !== 'folder') {
      return res.status(400).json({ error: 'Missing data' });
    }

    // Validate parentId if provided
    if (parentId) {
      const parentFile = await db.files.findOne({ _id: ObjectId(parentId) });

      if (!parentFile || parentFile.type !== 'folder') {
        return res
          .status(400)
          .json({ error: 'Parent not found or is not a folder' });
      }
    }

    // Create a new file document
    const newFile = {
      userId: ObjectId(userId),
      name,
      type,
      isPublic: isPublic || false,
      parentId: parentId || '0',
    };

    // If the type is a file or image, create the file on disk
    if (['file', 'image'].includes(type)) {
      const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
      const localPath = path.join(folderPath, `${uuidv4()}`);
      const fileData = Buffer.from(data, 'base64');

      // Save the file data to the local path
      fs.writeFileSync(localPath, fileData);

      newFile.localPath = localPath;
    }

    // Insert the new file document into the database
    const result = await db.files.insertOne(newFile);

    // Return the newly created file with a status code 201
    res.status(201).json({
      id: result.insertedId.toString(),
      userId: userId,
      name: newFile.name,
      type: newFile.type,
      isPublic: newFile.isPublic,
      parentId: newFile.parentId,
    });
  }

  // Publish a file by setting isPublic to true
  static async putPublish(req, res) {
    const fileId = req.params.id;

    // Retrieve the user based on the token
    const key = `auth_${req.token}`;
    const userId = await redisClient.get(key);

    // If the user is not found, return an error
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Find the file document by ID and user ID
    const file = await db.files.findOne({
      _id: ObjectId(fileId),
      userId: ObjectId(userId),
    });

    // If no file document is found, return an error
    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    // Update the value of isPublic to true
    await db.files.updateOne(
      { _id: ObjectId(fileId) },
      { $set: { isPublic: true } }
    );

    // Return the updated file document with a status code 200
    res.status(200).json(file);
  }

  // Unpublish a file by setting isPublic to false
  static async putUnpublish(req, res) {
    const fileId = req.params.id;

    // Retrieve the user based on the token
    const key = `auth_${req.token}`;
    const userId = await redisClient.get(key);

    // If the user is not found, return an error
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Find the file document by ID and user ID
    const file = await db.files.findOne({
      _id: ObjectId(fileId),
      userId: ObjectId(userId),
    });

    // If no file document is found, return an error
    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    // Update the value of isPublic to false
    await db.files.updateOne(
      { _id: ObjectId(fileId) },
      { $set: { isPublic: false } }
    );

    // Return the updated file document with a status code 200
    res.status(200).json(file);
  }

  // Get the content of a file based on its ID
  static async getFile(req, res) {
    const fileId = req.params.id;

    // Retrieve the user based on the token
    const key = `auth_${req.token}`;
    const userId = await redisClient.get(key);

    // If no user is found, return an error
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Find the file document by ID
    const file = await db.files.findOne({
      _id: ObjectId(fileId),
    });

    // If no file document is found, return an error
    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    // Check if the file is public or the user is the owner
    if (!file.isPublic && file.userId.toString() !== userId) {
      return res.status(404).json({ error: 'Not found' });
    }

    // If the file is a folder, return an error
    if (file.type === 'folder') {
      return res.status(400).json({ error: "A folder doesn't have content" });
    }

    // Construct the local path to the file
    const localPath = path.join(
      process.env.FOLDER_PATH || '/tmp/files_manager',
      file.localPath
    );

    // Check if the file exists locally
    if (!fs.existsSync(localPath)) {
      return res.status(404).json({ error: 'Not found' });
    }

    // Get the MIME-type based on the file name
    const mimeType = mime.lookup(file.name);

    // Read the file and send its content with the appropriate MIME-type
    fs.readFile(localPath, (err, data) => {
      if (err) {
        return res.status(500).json({ error: 'Internal Server Error' });
      }

      res.setHeader('Content-Type', mimeType);
      res.status(200).send(data);
    });
  }
}

module.exports = FilesController;
