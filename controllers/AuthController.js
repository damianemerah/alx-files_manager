const sha1 = require('sha1');
const { v4: uuidv4 } = require('uuid');
const RedisClient = require('../utils/redis');
const DBClient = require('../utils/db');

const redisClient = new RedisClient();
const db = new DBClient();

class AuthController {
  // Sign-in the user and generate a new authentication token
  // eslint-disable-next-line consistent-return
  static async getConnect(req, res) {
    // Extract Basic Auth credentials from the Authorization header
    const credentials = req.headers.authorization.split(' ')[1];
    const [email, password] = Buffer.from(credentials, 'base64')
      .toString()
      .split(':');

    // Find the user associated with the email and password
    const user = await db.users.findOne({ email, password: sha1(password) });

    // If no user is found, return an error
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Generate a random token using uuidv4
    const token = uuidv4();

    // Create a Redis key for the token and store the user ID for 24 hours
    const key = `auth_${token}`;
    await redisClient.setex(key, 86400, user._id.toString());

    // Return the generated token
    res.status(200).json({ token });
  }

  // Sign-out the user based on the token
  static async getDisconnect(req, res) {
    const { token } = req.body;

    // Retrieve the user based on the token
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    // If the user is not found, return an error
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Delete the token in Redis
    await redisClient.del(key);

    // Return a successful response with status code 204 (no content)
    return res.status(204).send();
  }
}

module.exports = AuthController;
