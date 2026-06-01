import request from 'supertest';
import app from '../src/app.js';
import User from '../src/Models/User.model.js';
import axios from 'axios';
import mongoose from 'mongoose';
import { jest } from '@jest/globals';

describe('Identity Verification API', () => {
    let token;
    let adminToken;

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
                        result_image: "results/test_match_image.jpg",
                        extracted_data: {
                            national_id: "29001010000001",
                            birth_date: "1990-01-01"
                        }
                    }
                });
            }
            return Promise.resolve({ data: {} });
        });

        // Create a dummy result file for the test
        const fs = await import('fs');
        const path = await import('path');
        const testImageDir = path.join(process.cwd(), 'FixPay-AI-Identification', 'results');
        if (!fs.existsSync(testImageDir)) {
            fs.mkdirSync(testImageDir, { recursive: true });
        }
        const testImagePath = path.join(testImageDir, 'test_match_image.jpg');
        fs.writeFileSync(testImagePath, 'fake-match-image-content');

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

        const adminData = {
            name: { first: "Admin", last: "User" },
            userName: "adminuser",
            email: "admin@test.com",
            password: "Password123",
            confirmPassword: "Password123",
            dateOfBirth: "01-01-1990",
            gender: true,
            phoneNumber: "01000000001",
            ssn: "29001010000002",
            role: "admin"
        };
        const adminRegRes = await request(app).post('/api/user/register').send(adminData);
        if (adminRegRes.status !== 201) console.error("Admin Registration Failed:", adminRegRes.body);
        await User.findOneAndUpdate({ email: adminData.email }, { verifiedAt: new Date() });
        const adminLoginRes = await request(app).post('/api/user/login').send({
            email: adminData.email,
            password: "Password123"
        });
        adminToken = adminLoginRes.body.token;
    });

    afterAll(async () => {
        const fs = await import('fs');
        const path = await import('path');
        const testImagePath = path.join(process.cwd(), 'FixPay-AI-Identification', 'results', 'test_match_image.jpg');
        if (fs.existsSync(testImagePath)) {
            fs.unlinkSync(testImagePath);
        }
    });

    it('should verify identity successfully with mock AI response', async () => {
        // Creating distinct dummy buffers to simulate different image files
        const dummyIdImage = Buffer.from('fake-id-image-data');
        const dummyLiveImage = Buffer.from('fake-live-image-data');

        const res = await request(app)
            .post('/api/user/verify-identity')
            .set('Authorization', `bearer ${token}`)
            .attach('id_image', dummyIdImage, 'id.jpg')
            .attach('live_image', dummyLiveImage, 'face.jpg');

        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('success');
        expect(res.body.match).toBe(true);
        expect(res.body.details.resultImage).toBe('https://cloudinary.com/test-image.jpg');
        
        // Verify user state in DB
        const user = await User.findOne({ email: "verify@test.com" });
        expect(user.identityVerification.status).toBe('verified');
        expect(user.identityVerification.resultImage).toBe('https://cloudinary.com/test-image.jpg');
    });

    it('should fail if ID image and live selfie are identical', async () => {
        const dummyImage = Buffer.from('fake-image-data');

        const res = await request(app)
            .post('/api/user/verify-identity')
            .set('Authorization', `bearer ${token}`)
            .attach('id_image', dummyImage, 'id.jpg')
            .attach('live_image', dummyImage, 'face.jpg');

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toContain('cannot be the same image');
    });

    it('should fail if images are missing', async () => {
        const res = await request(app)
            .post('/api/user/verify-identity')
            .set('Authorization', `bearer ${token}`);

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toContain('required');
    });

    it('should allow admin to fetch user AI result image', async () => {
        const user = await User.findOne({ email: "verify@test.com" });
        const res = await request(app)
            .get(`/api/user/${user._id}/ai-result`)
            .set('Authorization', `bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('success');
        expect(res.body.data.resultImage).toBe('https://cloudinary.com/test-image.jpg');
    });

    it('should deny non-admin from fetching user AI result image', async () => {
        const user = await User.findOne({ email: "verify@test.com" });
        const res = await request(app)
            .get(`/api/user/${user._id}/ai-result`)
            .set('Authorization', `bearer ${token}`);

        expect(res.statusCode).toBe(403);
    });
});
