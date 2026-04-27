import request from 'supertest';
import app from '../src/app.js';
import User from '../src/Models/User.model.js';
import axios from 'axios';
import mongoose from 'mongoose';
import { jest } from '@jest/globals';

describe('Identity Verification API', () => {
    let token;

    beforeAll(async () => {
        await mongoose.model('Users').deleteMany({});
        
        // Mock Axios specifically for this test
        jest.spyOn(axios, 'post').mockImplementation((url) => {
            if (url.includes('/verify')) {
                return Promise.resolve({
                    data: {
                        match: true,
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
        });

        const userData = {
            name: { first: "Verify", last: "Me" },
            userName: "verifyme",
            email: "verify@test.com",
            password: "Password123",
            confirmPassword: "Password123",
            dateOfBirth: "01-01-1990",
            gender: true,
            phoneNumber: "01000000000",
            ssn: "29001010000001",
            role: "user"
        };

        const regRes = await request(app).post('/api/user/register').send(userData);
        if (regRes.status !== 201) console.error("Identity User Registration Failed:", regRes.body);
        await User.findOneAndUpdate({ email: userData.email }, { verifiedAt: new Date() });

        const loginRes = await request(app).post('/api/user/login').send({
            email: userData.email,
            password: "Password123"
        });
        if (loginRes.status !== 200) console.error("Identity User Login Failed:", loginRes.body);
        token = loginRes.body.token;
    });

    it('should verify identity successfully with mock AI response', async () => {
        // Creating dummy buffers to simulate image files
        const dummyImage = Buffer.from('fake-image-data');

        const res = await request(app)
            .post('/api/user/verify-identity')
            .set('Authorization', `bearer ${token}`)
            .attach('id_image', dummyImage, 'id.jpg')
            .attach('live_image', dummyImage, 'face.jpg');

        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('success');
        expect(res.body.match).toBe(true);
        
        // Verify user state in DB
        const user = await User.findOne({ email: "verify@test.com" });
        expect(user.identityVerification.status).toBe('verified');
    });

    it('should fail if images are missing', async () => {
        const res = await request(app)
            .post('/api/user/verify-identity')
            .set('Authorization', `bearer ${token}`);

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toContain('required');
    });
});
