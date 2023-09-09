// controllers/UsersController.js

const { ObjectId } = require('mongodb'); // Import ObjectId from MongoDB
const sha1 = require('sha1'); // Import the sha1 library for hashing

const DBClient = require('../utils/db');
const db = new DBClient();

class UsersController {
  // Create a new user
  static async postNew(req, res) {
    // Get the email and password from the request body
    const { email, password } = req.body;

    // Check if email and password are provided
    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    // Check if the email already exists in the database
    const userExists = await db.users.findOne({ email });
    if (userExists) {
      return res.status(400).json({ error: 'Already exist' });
    }

    // Hash the password using SHA1
    const hashedPassword = sha1(password);

    // Create a new user document
    const newUser = {
      email,
      password: hashedPassword,
    };

    try {
      // Insert the new user into the database
      const result = await db.users.insertOne(newUser);

      // Return the newly created user with only email and id
      res.status(201).json({ id: result.insertedId, email });
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

module.exports = UsersController;
