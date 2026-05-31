import request from 'supertest';
import app from '../src/app.js';
import Category from '../src/Models/Category.model.js';
import User from '../src/Models/User.model.js';
import Task from '../src/Models/Task.model.js';
import Offer from '../src/Models/Offer.model.js';
import axios from 'axios';
import { jest } from '@jest/globals';

describe('Worker Recommendation API', () => {
    let customerToken;
    let otherWorkerToken;
    let otherCustomerToken;
    let categoryId;
    let otherCategoryId;
    let taskId;
    let taskIdNoCoords;

    beforeAll(async () => {
        // Create Categories
        const cat1 = await Category.create({ name: "Plumbing Service" });
        categoryId = cat1._id;

        const cat2 = await Category.create({ name: "Carpentry Service" });
        otherCategoryId = cat2._id;

        // 1. Register & Login Customer
        const customerData = {
            name: { first: "Cust", last: "Omer" },
            userName: "cust_recom",
            email: "cust_recom@test.com",
            password: "Password123",
            confirmPassword: "Password123",
            dateOfBirth: "01-01-1990",
            gender: true,
            phoneNumber: "01099999999",
            ssn: "29001010000099",
            role: "user"
        };
        await request(app).post('/api/user/register').send(customerData);
        await User.findOneAndUpdate({ email: customerData.email }, { verifiedAt: new Date() });
        const custRes = await request(app).post('/api/user/login').send({
            email: customerData.email,
            password: customerData.password
        });
        customerToken = custRes.body.token;

        // 2. Register Workers with Location & Ratings
        // Worker 1: Giza (Closer to Maadi)
        const worker1Data = {
            name: { first: "Giza", last: "Worker" },
            userName: "worker_giza",
            email: "giza@test.com",
            password: "Password123",
            confirmPassword: "Password123",
            dateOfBirth: "01-01-1990",
            gender: false,
            phoneNumber: "01099999991",
            ssn: "29001010000091",
            role: "worker",
            categoryId: categoryId,
            locationCoords: { lat: 30.0131, lng: 31.2089 }
        };
        await request(app).post('/api/user/register').send(worker1Data);
        await User.findOneAndUpdate({ email: worker1Data.email }, { verifiedAt: new Date(), rating: 4.9 });

        // Worker 2: Cairo Center (Middle)
        const worker2Data = {
            name: { first: "Cairo", last: "Worker" },
            userName: "worker_cairo",
            email: "cairo@test.com",
            password: "Password123",
            confirmPassword: "Password123",
            dateOfBirth: "01-01-1990",
            gender: false,
            phoneNumber: "01099999992",
            ssn: "29001010000092",
            role: "worker",
            categoryId: categoryId,
            locationCoords: { lat: 30.0444, lng: 31.2357 }
        };
        await request(app).post('/api/user/register').send(worker2Data);
        await User.findOneAndUpdate({ email: worker2Data.email }, { verifiedAt: new Date(), rating: 4.8 });

        // Worker 3: Alexandria (Very Far)
        const worker3Data = {
            name: { first: "Alex", last: "Worker" },
            userName: "worker_alex",
            email: "alex@test.com",
            password: "Password123",
            confirmPassword: "Password123",
            dateOfBirth: "01-01-1990",
            gender: false,
            phoneNumber: "01099999993",
            ssn: "29001010000093",
            role: "worker",
            categoryId: categoryId,
            locationCoords: { lat: 31.2001, lng: 29.9187 }
        };
        await request(app).post('/api/user/register').send(worker3Data);
        await User.findOneAndUpdate({ email: worker3Data.email }, { verifiedAt: new Date(), rating: 5.0 });

        // Worker 4: Carpentry worker (Different category, shouldn't be recommended)
        const worker4Data = {
            name: { first: "Carp", last: "Worker" },
            userName: "worker_carp",
            email: "carp@test.com",
            password: "Password123",
            confirmPassword: "Password123",
            dateOfBirth: "01-01-1990",
            gender: false,
            phoneNumber: "01099999994",
            ssn: "29001010000094",
            role: "worker",
            categoryId: otherCategoryId,
            locationCoords: { lat: 30.0131, lng: 31.2089 }
        };
        await request(app).post('/api/user/register').send(worker4Data);
        await User.findOneAndUpdate({ email: worker4Data.email }, { verifiedAt: new Date(), rating: 4.5 });

        // Worker 5: Non-matching plumber for auth tests
        const worker5Res = await request(app).post('/api/user/login').send({
            email: worker4Data.email,
            password: worker4Data.password
        });
        otherWorkerToken = worker5Res.body.token;

        // Register other customer for auth tests
        const otherCustomerData = {
            name: { first: "Other", last: "Customer" },
            userName: "other_customer",
            email: "other_customer@test.com",
            password: "Password123",
            confirmPassword: "Password123",
            dateOfBirth: "01-01-1990",
            gender: true,
            phoneNumber: "01099999995",
            ssn: "29001010000095",
            role: "user"
        };
        await request(app).post('/api/user/register').send(otherCustomerData);
        await User.findOneAndUpdate({ email: otherCustomerData.email }, { verifiedAt: new Date() });
        const otherCustRes = await request(app).post('/api/user/login').send({
            email: otherCustomerData.email,
            password: otherCustomerData.password
        });
        otherCustomerToken = otherCustRes.body.token;

        // 3. Create Tasks
        // Task with locationCoords in Maadi, Cairo (lat: 29.9602, lng: 31.2569)
        const taskRes = await request(app)
            .post('/api/tasks')
            .set('Authorization', `bearer ${customerToken}`)
            .send({
                title: "Need plumber urgently",
                description: "The sink pipe has burst and kitchen is flooded.",
                categoryId: categoryId,
                budget: 300,
                location: "Maadi, Cairo",
                locationCoords: { lat: 29.9602, lng: 31.2569 }
            });
        taskId = taskRes.body.data.task._id;

        // Task with NO coordinates
        const taskNoCoordsRes = await request(app)
            .post('/api/tasks')
            .set('Authorization', `bearer ${customerToken}`)
            .send({
                title: "Need Plumber No Coords",
                description: "The sink pipe has burst and kitchen is flooded.",
                categoryId: categoryId,
                budget: 350,
                location: "Maadi, Cairo"
            });
        taskIdNoCoords = taskNoCoordsRes.body.data.task._id;

        // Create mock offers for Worker 1 and Worker 2
        const w1 = await User.findOne({ email: "giza@test.com" });
        const w2 = await User.findOne({ email: "cairo@test.com" });

        await Offer.create([
            { taskId, workerId: w1._id, price: 290, message: "I can do it." },
            { taskId, workerId: w2._id, price: 300, message: "I will do it." }
        ]);
    }, 30000);

    it('should successfully recommend the nearest workers and display their rating', async () => {
        // Mock axios.get for OSRM routing in tests
        const axiosSpy = jest.spyOn(axios, 'get').mockImplementation((url) => {
            if (url.includes('router.project-osrm.org')) {
                return Promise.resolve({
                    data: {
                        routes: [
                            {
                                distance: 8200, // 8.2 km
                                duration: 720  // 12 mins
                            }
                        ]
                    }
                });
            }
            return Promise.resolve({ data: {} });
        });

        const res = await request(app)
            .get(`/api/tasks/${taskId}/recommend-workers`)
            .set('Authorization', `bearer ${customerToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('success');
        expect(res.body.data).toBeDefined();
        
        const recommendations = res.body.data.recommendations;
        expect(recommendations.length).toBe(2); // Should suggest Worker 1 and 2 (who sent offers)

        // Nearest should be Giza (Giza -> Maadi straight-line ~ 7.5km)
        // Next should be Cairo Center (~ 9.5km)
        expect(recommendations[0].worker.userName).toBe('worker_giza');
        expect(recommendations[1].worker.userName).toBe('worker_cairo');

        // Verify ratings are returned
        expect(recommendations[0].worker.rating).toBe(4.9);
        expect(recommendations[1].worker.rating).toBe(4.8);

        // Verify offer details are present
        expect(recommendations[0].offer).toBeDefined();
        expect(recommendations[0].offer.price).toBe(290);
        expect(recommendations[0].offer.message).toBe("I can do it.");

        expect(recommendations[1].offer).toBeDefined();
        expect(recommendations[1].offer.price).toBe(300);
        expect(recommendations[1].offer.message).toBe("I will do it.");

        // Verify straightLineDistance is computed
        expect(recommendations[0].straightLineDistance).toBeGreaterThan(0);

        // Verify driving duration and distance from OSRM mock are present
        expect(recommendations[0].drivingDistance).toBe(8.2);
        expect(recommendations[0].drivingTime).toBe(12);

        axiosSpy.mockRestore();
    });

    it('should forbid non-customer roles from accessing task recommendations', async () => {
        const res = await request(app)
            .get(`/api/tasks/${taskId}/recommend-workers`)
            .set('Authorization', `bearer ${otherWorkerToken}`);

        expect(res.statusCode).toBe(403);
        expect(res.body.message).toContain('permission');
    });

    it('should forbid other customers (non-owners) from accessing task recommendations', async () => {
        const res = await request(app)
            .get(`/api/tasks/${taskId}/recommend-workers`)
            .set('Authorization', `bearer ${otherCustomerToken}`);

        expect(res.statusCode).toBe(403);
        expect(res.body.message).toContain('Not authorized');
    });

    it('should return error if task coordinates are missing', async () => {
        const res = await request(app)
            .get(`/api/tasks/${taskIdNoCoords}/recommend-workers`)
            .set('Authorization', `bearer ${customerToken}`);

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toContain('coordinates defined');
    });
});
