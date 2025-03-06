import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import "./cron.js"

const app = express();

dotenv.config();

app.use(express.json());
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']

}));


import medicineRoutes from './routes/medicine.js';

// Routes
app.use('/medicines', medicineRoutes);



export default app;
