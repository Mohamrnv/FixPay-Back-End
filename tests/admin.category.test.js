import request from 'supertest';
import app from '../src/app.js';
import User from '../src/Models/User.model.js';
import Category from '../src/Models/Category.model.js';
import mongoose from 'mongoose';

describe('Admin and Category API', () => {
    let adminToken;
    let normalUserId;

    const adminData = {
        name: { first: "Admin", last: "User" },
        userName: "admin1",
        email: "admin@test.com",
        password: "Password123",
        confirmPassword: "Password123",
        dateOfBirth: "01-01-1990",
        gender: false,
        phoneNumber: "01000000000",
        ssn: "29001019999999",
        role: "admin"
    };

    beforeAll(async () => {
        await mongoose.model('Users').deleteMany({});
        await mongoose.model('Category').deleteMany({});

        // Register & Login Admin
        await request(app).post('/api/user/register').send(adminData);
        await User.findOneAndUpdate({ email: adminData.email }, { verifiedAt: new Date() });
        
        const res = await request(app).post('/api/user/login').send({
            email: adminData.email,
            password: adminData.password
        });
        adminToken = res.body.token;

        // Create a normal user to manage
        const userData = {
            name: { first: "Poor", last: "User" },
            userName: "pooruser",
            email: "poor@test.com",
            password: "Password123",
            confirmPassword: "Password123",
            dateOfBirth: "01-01-1995",
            gender: true,
            phoneNumber: "01099999999",
            ssn: "29501010000001",
            role: "user"
        };
        await request(app).post('/api/user/register').send(userData);
        const userInDb = await User.findOne({ email: userData.email });
        normalUserId = userInDb._id;
    });

    describe('Category Administration', () => {
        it('should allow admin to create a category', async () => {
            const res = await request(app)
                .post('/api/categories')
                .set('Authorization', `bearer ${adminToken}`)
                .send({ name: "Carpentry" });

            expect(res.statusCode).toBe(201);
            expect(res.body.data.category.name).toBe("Carpentry");
        });

        it('should fail if normal user tries to create a category', async () => {
            const res = await request(app)
                .post('/api/categories')
                .send({ name: "Forbidden" });

            expect(res.statusCode).toBe(401); // No token
        });
    });

    describe('User Administration', () => {
        it('should allow admin to suspend a user', async () => {
            const suspendedUntil = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
            const res = await request(app)
                .patch(`/api/user/suspend/${normalUserId}`)
                .set('Authorization', `bearer ${adminToken}`)
                .send({
                    suspendUntil: suspendedUntil.toISOString(),
                    suspensionReason: "Violated terms of service"
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toContain('suspended');
            
            const user = await User.findById(normalUserId);
            expect(user.suspendedUntil).toBeDefined();
        });

        it('should allow admin to promote a user to admin', async () => {
            const res = await request(app)
                .patch(`/api/user/assign-admin/${normalUserId}`)
                .set('Authorization', `bearer ${adminToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toContain('admin');

            const user = await User.findById(normalUserId);
            expect(user.role).toBe('admin');
        });
    });
});
