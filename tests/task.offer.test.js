import request from 'supertest';
import app from '../src/app.js';
import Category from '../src/Models/Category.model.js';
import User from '../src/Models/User.model.js';
import Task from '../src/Models/Task.model.js';
import Offer from '../src/Models/Offer.model.js';

describe('Tasks and Offers API', () => {
    let customerToken;
    let workerToken;
    let categoryId;
    let taskId;

    const customerData = {
        name: { first: "Cust", last: "Omer" },
        userName: "customer1",
        email: "customer@test.com",
        password: "Password123",
        confirmPassword: "Password123",
        dateOfBirth: "01-01-1990",
        gender: true,
        phoneNumber: "01011111111",
        ssn: "29001010000001",
        role: "user"
    };

    const workerData = {
        name: { first: "Work", last: "Er" },
        userName: "worker1",
        email: "worker@test.com",
        password: "Password123",
        confirmPassword: "Password123",
        dateOfBirth: "01-01-1990",
        gender: false,
        phoneNumber: "01022222222",
        ssn: "29001010000002",
        role: "worker"
    };

    beforeAll(async () => {
        // Register & Login Customer
        await request(app).post('/api/user/register').send(customerData);
        // Verify email (manual DB update for speed)
        await User.findOneAndUpdate({ email: customerData.email }, { verifiedAt: new Date() });
        const custRes = await request(app).post('/api/user/login').send({
            email: customerData.email,
            password: customerData.password
        });
        customerToken = custRes.body.token;

        // Create Category
        const cat = await Category.create({ name: "Plumbing" });
        categoryId = cat._id;

        // Register & Login Worker
        workerData.categoryId = categoryId;
        await request(app).post('/api/user/register').send(workerData);
        await User.findOneAndUpdate({ email: workerData.email }, { verifiedAt: new Date() });
        const workRes = await request(app).post('/api/user/login').send({
            email: workerData.email,
            password: workerData.password
        });
        workerToken = workRes.body.token;
    });

    describe('Task Flow', () => {
        it('should create a new task as a customer', async () => {
            const res = await request(app)
                .post('/api/tasks')
                .set('Authorization', `bearer ${customerToken}`)
                .send({
                    title: "Fix my leaking pipe",
                    description: "Kitchen sink is leaking since morning.",
                    categoryId: categoryId,
                    budget: 500,
                    location: "Maadi, Cairo"
                });

            expect(res.statusCode).toBe(201);
            expect(res.body.data.task.title).toBe("Fix my leaking pipe");
            taskId = res.body.data.task._id;
        });

        it('should show the task in open tasks list', async () => {
            const res = await request(app)
                .get('/api/tasks/open')
                .set('Authorization', `bearer ${workerToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.data.tasks.length).toBeGreaterThan(0);
        });
    });

    describe('Offer & Negotiation Flow', () => {
        let offerId;

        it('should allow worker to submit an offer', async () => {
            const res = await request(app)
                .post('/api/offers')
                .set('Authorization', `bearer ${workerToken}`)
                .send({
                    taskId: taskId,
                    price: 450,
                    message: "I can do it for 450 EGP today."
                });

            expect(res.statusCode).toBe(201);
            expect(res.body.data.offer.price).toBe(450);
            offerId = res.body.data.offer._id;
        });

        it('should allow customer to counter-offer', async () => {
            const res = await request(app)
                .patch(`/api/offers/${offerId}/counter`)
                .set('Authorization', `bearer ${customerToken}`)
                .send({
                    price: 400,
                    message: "Can you do it for 400?"
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.data.offer.status).toBe('countered');
            expect(res.body.data.offer.price).toBe(400);
        });

        it('should allow customer to accept the offer', async () => {
            const res = await request(app)
                .patch(`/api/offers/${offerId}/accept`)
                .set('Authorization', `bearer ${customerToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toContain('accepted');
            
            const task = await Task.findById(taskId);
            expect(task.status).toBe('assigned');
            expect(task.workerId).toBeDefined();
        });
    });
});
