import request from 'supertest';
import { jest } from '@jest/globals';
import app from '../src/app.js';
import User from '../src/Models/User.model.js';
import { localEmmiter } from '../src/Utils/Services/sendEmail.service.js';

// Mock the email emitter to avoid sending real emails
jest.spyOn(localEmmiter, 'emit').mockImplementation(() => true);

describe('User Authentication API', () => {
    const validUser = {
        name: { first: "John", last: "Doe" },
        userName: "johndoe123",
        email: "john@example.com",
        password: "Password123",
        confirmPassword: "Password123",
        dateOfBirth: "01-01-1990",
        gender: false, // male
        phoneNumber: "01012345678",
        ssn: "29001011234567",
        role: "user"
    };

    describe('POST /api/user/register', () => {
        it('should register a new user successfully', async () => {
            const res = await request(app)
                .post('/api/user/register')
                .send(validUser);

            expect(res.statusCode).toBe(201);
            expect(res.body.status).toBe('success');
            expect(res.body.data.user.email).toBe(validUser.email);
            expect(res.body.data.token).toBeDefined();

            const userInDb = await User.findOne({ email: validUser.email });
            expect(userInDb).toBeDefined();
            expect(userInDb.userName).toBe(validUser.userName);
        });

        it('should fail if email is already registered', async () => {
            await request(app).post('/api/user/register').send(validUser);
            
            const res = await request(app)
                .post('/api/user/register')
                .send(validUser);

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toContain('unavailable');
        });

        it('should fail registration with invalid data (short password)', async () => {
            const invalidUser = { ...validUser, password: '123', confirmPassword: '123' };
            const res = await request(app)
                .post('/api/user/register')
                .send(invalidUser);

            expect(res.statusCode).toBe(400);
            expect(res.body.status).toBe('fail');
        });
    });

    describe('POST /api/user/login', () => {
        beforeEach(async () => {
            // Register a user before login tests
            await request(app).post('/api/user/register').send(validUser);
        });

        it('should login successfully with correct credentials', async () => {
            const res = await request(app)
                .post('/api/user/login')
                .send({
                    email: validUser.email,
                    password: validUser.password
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.token).toBeDefined();
            expect(res.body.message).toBe('successfully signed');
        });

        it('should fail with incorrect password', async () => {
            const res = await request(app)
                .post('/api/user/login')
                .send({
                    email: validUser.email,
                    password: 'WrongPassword'
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toContain('match');
        });
    });
});
