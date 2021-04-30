const dotenv = require('dotenv').config() ;


const server = require('./server/server.js');

const app = require('./app/app.js');
const port = app.get('port');




const getMemUsage = () => {
    const total = process.memoryUsage().heapTotal / 1024 / 1024;
    const used = process.memoryUsage().heapUsed / 1024 / 1024;
    console.log(`The script uses approximately ${Math.round(used * 100) / 100} MB over ${Math.round(total * 100) / 100} MB total`);
    return used/total;
}



server.listen(port, () => {
    console.log('server running on port ', port);

    getMemUsage() ;

    
});