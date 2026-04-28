import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";

const PYTHON_API_URL = "http://localhost:5000";

async function test() {
    try {
        console.log("Reading images...");
        const ssn = fs.readFileSync(path.join(process.cwd(), "Ai_identification", "ssn.jpeg"));
        const face = fs.readFileSync(path.join(process.cwd(), "Ai_identification", "face.jpeg"));
        console.log(`  ssn.jpeg: ${ssn.length} bytes`);
        console.log(`  face.jpeg: ${face.length} bytes`);
        
        console.log("\nBuilding form...");
        const form = new FormData();
        form.append("id_image", ssn, { filename: "ssn.jpeg", contentType: "image/jpeg" });
        form.append("live_image", face, { filename: "face.jpeg", contentType: "image/jpeg" });
        
        console.log(`Sending request to ${PYTHON_API_URL}/verify ...`);
        const { data } = await axios.post(`${PYTHON_API_URL}/verify`, form, {
            headers: form.getHeaders(),
            timeout: 60000
        });
        
        console.log("\n=== AI VERIFICATION RESULT ===");
        console.log(JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("Error:", err.message);
        if (err.response) {
            console.error("Response Status:", err.response.status);
            console.error("Response Data:", err.response.data);
        } else if (err.code === 'ECONNREFUSED') {
            console.error("Connection Refused - Python API is NOT running on port 5000.");
        }
    }
}

test();
