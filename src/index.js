import app from './app.js';
import dbConnection from './DB/db.connection.js';
import "dotenv/config";

const port = process.env.PORT || 2001;

dbConnection();

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});