import request from 'supertest';
import app from '../src/app.js';
import User from '../src/Models/User.model.js';
import Task from '../src/Models/Task.model.js';
import Category from '../src/Models/Category.model.js';
import Offer from '../src/Models/Offer.model.js';
import Message from '../src/Models/Message.model.js';
import mongoose from 'mongoose';

describe('Messaging (Chat) API', () => {
    let customerToken;
    let workerToken;
    let taskId;
    let workerId;

    beforeAll(async () => {
        // Clear collections to avoid duplicates
        await mongoose.model('Users').deleteMany({});
        await mongoose.model('Task').deleteMany({});
        await mongoose.model('Category').deleteMany({});
        await mongoose.model('Offer').deleteMany({});

        // Create users
        const customerData = {
            name: { first: "Chat", last: "Customer" },
            userName: "chatcustomer",
            email: "chat_customer@test.com",
            password: "Password123",
            confirmPassword: "Password123",
            dateOfBirth: "01-01-1990",
            gender: true,
            phoneNumber: "01000000001",
            ssn: "29001010000011",
            role: "user"
        };
        
        // Create Category
        const cat = await Category.create({ name: "Chat Support" });

        const workerData = {
            name: { first: "Chat", last: "Worker" },
            userName: "chatworker",
            email: "chat_worker@test.com",
            password: "Password123",
            confirmPassword: "Password123",
            dateOfBirth: "01-01-1990",
            gender: false,
            phoneNumber: "01000000002",
            ssn: "29001010000012",
            role: "worker",
            categoryId: cat._id
        };

        const cReg = await request(app).post('/api/user/register').send(customerData);
        if (cReg.status !== 201) console.error("Customer Registration Failed:", cReg.body);
        await User.findOneAndUpdate({ email: customerData.email }, { verifiedAt: new Date() });
        
        const wReg = await request(app).post('/api/user/register').send(workerData);
        if (wReg.status !== 201) console.error("Worker Registration Failed:", wReg.body);
        await User.findOneAndUpdate({ email: workerData.email }, { verifiedAt: new Date() });

        const customer = await User.findOne({ email: customerData.email });
        const worker = await User.findOne({ email: workerData.email });
        if (!worker) throw new Error("Worker not found after registration!");
        workerId = worker._id;

        // Login both
        const cLogin = await request(app).post('/api/user/login').send({ email: customerData.email, password: "Password123" });
        customerToken = cLogin.body.token;
        
        const wLogin = await request(app).post('/api/user/login').send({ email: workerData.email, password: "Password123" });
        workerToken = wLogin.body.token;

        // Create Task
        const task = await Task.create({
            title: "Chat Test Task",
            description: "Need someone for chat testing",
            customerId: customer._id,
            budget: 100,
            categoryId: cat._id,
            location: "Online"
        });
        taskId = task._id;

        // Create Offer (essential for chat)
        await Offer.create({
            taskId,
            workerId: worker._id,
            price: 90,
            message: "I am interested",
            negotiationHistory: [{ price: 90, bidBy: worker._id }]
        });
    });

    it('should allow worker to send a message to customer', async () => {
        const res = await request(app)
            .post('/api/messages')
            .set('Authorization', `bearer ${workerToken}`)
            .send({
                taskId,
                receiverId: (await Task.findById(taskId)).customerId,
                content: "Hello customer, I can do this job."
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.data.message.content).toBe("Hello customer, I can do this job.");
    });

    it('should allow customer to view messages', async () => {
        const res = await request(app)
            .get(`/api/messages/${taskId}/${workerId}`)
            .set('Authorization', `bearer ${customerToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.data.messages.length).toBeGreaterThan(0);
        expect(res.body.data.messages[0].content).toContain("Hello customer");
    });

    it('should prevent strangers from chatting', async () => {
        const strangerData = {
            name: { first: "Str", last: "Anger" },
            userName: "stranger1",
            email: "stranger@test.com",
            password: "Password123",
            confirmPassword: "Password123",
            dateOfBirth: "01-01-1990",
            gender: true,
            phoneNumber: "01000000003",
            ssn: "29001010000013"
        };
        await request(app).post('/api/user/register').send(strangerData);
        await User.findOneAndUpdate({ email: strangerData.email }, { verifiedAt: new Date() });

        const sLogin = await request(app).post('/api/user/login').send({ email: strangerData.email, password: "Password123" });
        const strangerToken = sLogin.body.token;

        const res = await request(app)
            .post('/api/messages')
            .set('Authorization', `bearer ${strangerToken}`)
            .send({
                taskId,
                receiverId: workerId,
                content: "Impersonating chat"
            });

        expect(res.statusCode).toBe(403);
    });
});
