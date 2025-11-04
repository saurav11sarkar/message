import mongoose from 'mongoose';
import app from './app';
import config from './app/config';
import http from 'http';
import initializeSocketIO from './app/helper/socketIO';

const PORT = config.port;

const main = async () => {
  try {
    if (!config.mongoUri) {
      throw new Error('MongoDB URI is not defined in environment variables.');
    }

    const mongo = await mongoose.connect(config.mongoUri);
    console.log(`✅ MongoDB connected: ${mongo.connection.host}`);

    const httpServer = http.createServer(app);
    const io = initializeSocketIO(httpServer);

    app.set('io', io);

    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (error: any) {
    console.error('❌ Error starting server:', error.message || error);
    process.exit(1);
  }
};

main();
