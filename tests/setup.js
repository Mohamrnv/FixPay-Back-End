import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { jest } from '@jest/globals';

// Mock Cloudinary
jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload: jest.fn().mockResolvedValue({ 
          secure_url: 'https://cloudinary.com/test-image.jpg',
          public_id: 'test_id' 
      }),
      destroy: jest.fn().mockResolvedValue({ result: 'ok' })
    },
  },
}));

// Mock Axios for external identity API
jest.mock('axios', () => ({
    post: jest.fn().mockImplementation((url, data) => {
        if (url.includes('/verify')) {
            return Promise.resolve({ 
                data: { 
                    match: true, 
                    score: 0.95,
                    similarity: 0.95,
                    liveness: true,
                    extracted_data: {
                        national_id: "29001010000001",
                        birth_date: "1990-01-01"
                    }
                } 
            });
        }
        return Promise.resolve({ data: {} });
    }),
    get: jest.fn().mockResolvedValue({ data: {} })
}));

let mongo = null;

beforeAll(async () => {
    // Increase timeout for slow CI environments
    jest.setTimeout(30000);

    process.env.ENCRYPTION_KEY = "01234567890123456789012345678901";
    process.env.ENCRYPTION_IV = "0123456789012345";
    process.env.JWT_KEY = "test_jwt_secret";
    
    mongo = await MongoMemoryServer.create();
    const uri = mongo.getUri();
    await mongoose.connect(uri);
});

afterAll(async () => {
    if (mongo) {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
        await mongo.stop();
    }
});

/*
beforeEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany({});
    }
});
*/
