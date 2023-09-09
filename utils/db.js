const { MongoClient } = require('mongodb');

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const db = process.env.DB_DATABASE || 'files_manager';

    const uri = `mongodb://${host}:${port}/${db}`;

    this.client = new MongoClient(uri, { useUnifiedTopology: true });
    this.client.connect();
  }

  isAlive() {
    return this.client.isConnected();
  }

  async nbUsers() {
    try {
      return this.client.db().collection('users').countDocuments();
    } catch (err) {
      console.error(err);
    }
  }

  async nbFiles() {
    try {
      return this.client.db().collection('files').countDocuments();
    } catch (err) {
      console.error(err);
    }
  }
}

const dbClient = new DBClient();

module.exports = dbClient;
