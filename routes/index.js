const express = require('express');

const router = express.Router();
const AppController = require('../controllers/AppController');
const UsersController = require('../controllers/UsersController');
const AuthController = require('../controllers/AuthController');
const FilesController = require('../controllers/FilesController');
const { fileQueue } = require('../worker'); // Import fileQueue from the worker module
const { authenticate } = require('../middleware/auth');

router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStats);
router.post('/users', UsersController.postNew);
router.get('/connect', AuthController.getConnect);
router.get('/disconnect', AuthController.getDisconnect);
router.get('/users/me', UsersController.getMe);
router.post('/files', AuthController.verifyToken, FilesController.postUpload);
router.put(
  '/files/:id/publish',
  AuthController.verifyToken,
  FilesController.putPublish
);
router.put(
  '/files/:id/unpublish',
  AuthController.verifyToken,
  FilesController.putUnpublish
);
router.get(
  '/files/:id/data',
  AuthController.verifyToken,
  FilesController.getFile
);

// Update the endpoint for creating a new file to start a background job
router.post(
  '/files',
  AuthController.verifyToken,
  FilesController.postUpload,
  async (req, res) => {
    const { userId } = req.token;
    const fileId = req.responseBody.id;

    // Add a job to the queue for generating thumbnails
    await fileQueue.add({ userId, fileId });

    return res.status(201).json(req.responseBody);
  }
);

router.get('/files', authenticate, FilesController.getIndex);

module.exports = router;
