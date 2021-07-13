const dotenv = require('dotenv').config() ;
const utilities = require('./helpers/utilities.js');
const app = require('./app/app.js');
const port = app.get('port');

app.listen(port, () => {
    console.log('login server running on port ', port);
    utilities.getMemUsage() ;
});