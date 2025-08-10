import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Configure environment variables FIRST
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

// Debug log to verify loading
console.log('Environment Variables Loaded:', {
    GROQ_API_KEY: process.env.GROQ_API_KEY ? '****' + process.env.GROQ_API_KEY.slice(-4) : 'MISSING',
    NODE_ENV: process.env.NODE_ENV
});

const app = express();

const publicDirectory = path.join(__dirname, './public');
app.use(express.static(publicDirectory));

// Parse URL-encoded bodies (as sent by html forms)
app.use(express.urlencoded({ extended: false }));

// Parse JSON bodies (as sent by API clients)
app.use(express.json());

app.set('view engine', 'hbs');

// Define routes
import pagesRouter from './routes/pages.js';
app.use('/', pagesRouter);

app.use((req, res, next) => {
    const oldSend = res.send;
    res.send = function(data) {
      console.log('Response data:', data);
      oldSend.apply(res, arguments);
    };
    next();
});

// Import controller
import onboardingController from './controllers/onboardingController.js';
app.post('/api/analyze', onboardingController.analyzeRepository);

app.listen(process.env.PORT, () => {
    console.log(`Server started on ${process.env.PORT}`);
});