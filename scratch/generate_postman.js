import fs from 'fs';

const collection = {
    info: {
        name: "FixPay Back-End API",
        description: "Full API endpoints for the FixPay platform including Geolocation.",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    variable: [
        { key: "baseUrl", value: "http://localhost:2001/api", type: "string" },
        { key: "token", value: "YOUR_JWT_TOKEN", type: "string" }
    ],
    auth: {
        type: "bearer",
        bearer: [
            { key: "token", value: "{{token}}", type: "string" }
        ]
    },
    item: [
        {
            name: "User Module",
            item: [
                {
                    name: "Register",
                    request: {
                        method: "POST",
                        url: "{{baseUrl}}/user/register",
                        body: {
                            mode: "raw",
                            raw: JSON.stringify({
                                name: { first: "John", last: "Doe" },
                                userName: "johndoe123",
                                email: "john@example.com",
                                password: "password123",
                                phoneNumber: "+1234567890",
                                role: "user",
                                locationCoords: { lat: 30.0444, lng: 31.2357 }
                            }, null, 2),
                            options: { raw: { language: "json" } }
                        }
                    }
                },
                {
                    name: "Login",
                    request: {
                        method: "POST",
                        url: "{{baseUrl}}/user/login",
                        body: {
                            mode: "raw",
                            raw: JSON.stringify({ email: "john@example.com", password: "password123" }, null, 2),
                            options: { raw: { language: "json" } }
                        }
                    }
                },
                { name: "List all users", request: { method: "GET", url: "{{baseUrl}}/user" } },
                { name: "Get user by ID", request: { method: "GET", url: "{{baseUrl}}/user/:id" } },
                { name: "Update user profile", request: { method: "PATCH", url: "{{baseUrl}}/user/:id" } },
                { name: "Delete user", request: { method: "DELETE", url: "{{baseUrl}}/user/:id" } },
                { name: "Assign Admin", request: { method: "PATCH", url: "{{baseUrl}}/user/assign-admin/:id" } },
                { name: "Suspend User", request: { method: "PATCH", url: "{{baseUrl}}/user/suspend/:id" } },
                { name: "Logout", request: { method: "POST", url: "{{baseUrl}}/user/logout" } },
                { name: "Confirm Email", request: { method: "POST", url: "{{baseUrl}}/user/confirmEmail", body: { mode: "raw", raw: "{\"otp\": \"123456\"}", options: { raw: { language: "json" } } } } },
                { name: "Resend Confirmation OTP", request: { method: "POST", url: "{{baseUrl}}/user/resend-confirmation-otp" } },
                { name: "Complete Profile", request: { method: "POST", url: "{{baseUrl}}/user/complete-profile", body: { mode: "raw", raw: "{\"phoneNumber\": \"+123456789\", \"ssn\": \"12345678901234\"}", options: { raw: { language: "json" } } } } },
                { name: "Verify Identity", request: { method: "POST", url: "{{baseUrl}}/user/verify-identity", body: { mode: "formdata", formdata: [{ key: "id_image", type: "file" }, { key: "live_image", type: "file" }] } } },
                { name: "Upload Avatar", request: { method: "POST", url: "{{baseUrl}}/user/upload", body: { mode: "formdata", formdata: [{ key: "file", type: "file" }] } } },
                { name: "Forgot Password", request: { method: "POST", url: "{{baseUrl}}/user/forgotPassword", body: { mode: "raw", raw: "{\"email\": \"john@example.com\"}", options: { raw: { language: "json" } } } } },
                { name: "Reset Password", request: { method: "POST", url: "{{baseUrl}}/user/resetPassword", body: { mode: "raw", raw: "{\"email\": \"john@example.com\", \"otp\": \"123456\", \"newPassword\": \"newpass123\"}", options: { raw: { language: "json" } } } } }
            ]
        },
        {
            name: "Category Module",
            item: [
                { name: "List Categories", request: { method: "GET", url: "{{baseUrl}}/categories" } },
                { name: "Get Category", request: { method: "GET", url: "{{baseUrl}}/categories/:id" } },
                { name: "List Category Workers", request: { method: "GET", url: "{{baseUrl}}/categories/:id/workers" } },
                { name: "Create Category", request: { method: "POST", url: "{{baseUrl}}/categories", body: { mode: "raw", raw: "{\"name\": \"Plumbing\"}", options: { raw: { language: "json" } } } } }
            ]
        },
        {
            name: "Task Module",
            item: [
                { name: "List Open Tasks", request: { method: "GET", url: "{{baseUrl}}/tasks/open" } },
                { name: "Get Task Offers", request: { method: "GET", url: "{{baseUrl}}/tasks/:taskId/offers" } },
                {
                    name: "Post Task",
                    request: {
                        method: "POST",
                        url: "{{baseUrl}}/tasks",
                        body: {
                            mode: "formdata",
                            formdata: [
                                { key: "title", value: "Fix my sink", type: "text" },
                                { key: "description", value: "My sink is leaking and needs repair", type: "text" },
                                { key: "categoryId", value: "CATEGORY_ID_HERE", type: "text" },
                                { key: "budget", value: "50", type: "text" },
                                { key: "location", value: "Cairo, Egypt", type: "text" },
                                { key: "locationCoords[lat]", value: "30.0444", type: "text" },
                                { key: "locationCoords[lng]", value: "31.2357", type: "text" },
                                { key: "images", type: "file" }
                            ]
                        }
                    }
                },
                { name: "Update Task", request: { method: "PATCH", url: "{{baseUrl}}/tasks/:taskId" } },
                { name: "Delete Task", request: { method: "DELETE", url: "{{baseUrl}}/tasks/:taskId" } }
            ]
        },
        {
            name: "Offer Module",
            item: [
                {
                    name: "Submit Offer",
                    request: {
                        method: "POST",
                        url: "{{baseUrl}}/offers",
                        body: {
                            mode: "raw",
                            raw: JSON.stringify({
                                taskId: "TASK_ID_HERE",
                                price: 40,
                                message: "I can fix it today!"
                            }, null, 2),
                            options: { raw: { language: "json" } }
                        }
                    }
                },
                { name: "Accept Offer", request: { method: "PATCH", url: "{{baseUrl}}/offers/:offerId/accept" } },
                {
                    name: "Counter Offer",
                    request: {
                        method: "PATCH",
                        url: "{{baseUrl}}/offers/:offerId/counter",
                        body: { mode: "raw", raw: JSON.stringify({ price: 45, message: "Can you do 45?" }, null, 2), options: { raw: { language: "json" } } }
                    }
                },
                {
                    name: "Respond to Counter",
                    request: {
                        method: "PATCH",
                        url: "{{baseUrl}}/offers/:offerId/respond",
                        body: { mode: "raw", raw: JSON.stringify({ price: 45, message: "Deal." }, null, 2), options: { raw: { language: "json" } } }
                    }
                }
            ]
        },
        {
            name: "Message Module",
            item: [
                { name: "Send Message", request: { method: "POST", url: "{{baseUrl}}/messages", body: { mode: "raw", raw: "{\"receiverId\": \"USER_ID\", \"message\": \"Hello!\"}", options: { raw: { language: "json" } } } } },
                { name: "Get Chat History", request: { method: "GET", url: "{{baseUrl}}/messages/:otherUserId" } }
            ]
        }
    ]
};

fs.writeFileSync('FixPay_Postman_Collection.json', JSON.stringify(collection, null, 2));
console.log('Successfully generated FixPay_Postman_Collection.json');
