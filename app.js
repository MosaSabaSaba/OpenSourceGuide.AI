const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({path: './.env'});

const app = express();

const publicDirectory = path.join(__dirname, './public');
app.use(express.static(publicDirectory));


// Parse URL-encoded bodies (as sent by html forms) 
app.use(express.urlencoded({ extended: false}));

// Parse JSON bodies (as sent by API clients)
app.use(express.json());

app.set('view engine', 'hbs');

// Define routes
app.use('/', require('./routes/pages'));

app.listen(process.env.PORT, () => {
    console.log(`Server started on ${process.env.PORT}`);
})