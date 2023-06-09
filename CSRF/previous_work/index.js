/* 
A simple webapp with a login and state-changing requests, to demonstrate Cross Site Request Forgery (CSRF)
Author: Sindre Holtskog
*/

/*
Initial ideas:
Make a simple, hacky version. One state-changing action. 
Data storage for user-info: In-memory -> in file -> SQL-database. 
NO HTTPS - irrelevant for the demo.
*/

/*
TODO: 
* DONE: Create user data structures in memory
* Create backend functionality:
    * Password-comparison (maybe?)
    * Session-cookie handling (definitely)
    * Changing user-email
    * Providing user-data on profile page

* Demo CSRF change email for user
    * Create evil.com webpage to execute CSRF
    * Test etc etc.
*/


const bodyParser = require('body-parser');
const express = require('express');
const { request } = require('http');
const { type } = require('os');

const app = express();
app.use(bodyParser.urlencoded({ extended: true}));


// Experiments with middleware:
const requestTime = function (req, res, next) {
    req.requestTime = Date.now();
    /*
    console.log(req.requestTime);  // Epoch like 1655203881982
    console.log((new Date()).toLocaleDateString('en-GB'))  // 14/06/2022
    */
    next();
}

app.use(requestTime);

// Express session is used: Clientside cookie contains a reference to session data stored on the server.  
var session = require('express-session')



// Serving up static HTML-content for basic pages

app.get('/', (req, res) => {
    // TODO: if(userIsAuthenticated){ res.redirect(/profile);}
    res.sendFile(`${__dirname}/static/index.html`);
});

app.get('/login', function(req, res) {
    // TODO: if(userIsAuthenticated){ res.redirect(/profile);}
    res.sendFile(`${__dirname}/static/login.html`);
});

// Privileged route
app.get('/profile/change-email', function(req, res) {
    // TODO: if(!userIsAuthenticated){ res.redirect(/login);}
    res.sendFile(`${__dirname}/static/change-email.html`);
});



let users = [
    {
        "username":"admin",
        "password":"adminPassword",
    }
]


app.post('/login', function(req, res) {
    /*
    * Handle user login

    * Get username, password from request
    * Server validates
    * If not valid, response say invalid username/password
    * If valid, generate session cookie, store on server, send to client
    * redirect to /profile
    * 
    * Maybe strategic to redirect to /profile regardless of endpoint tried?
    * Redirecting to referrer could lead to open referrer attacks etc. 
    */

    const uname = req.body.username;
    const password = req.body.password;
    console.log(`Attempted login with: ${uname} : ${password}`);
    // OPTIONAL TODO: Add a better logging functionality. 

    // Lookup, comparison and response:
    let authorized = false;

    console.log("Looking up user...");
    let user = users.find(user => user.username === uname);
    if(user === undefined){
        console.log(`Username does not exist`)
        res.send('Login failed, wrong username or password');
        return;
    }
    else{
        if(password === user.password){
            // Success!
            console.log(`DEBUG: Login successful`);
            res.redirect(`/profile`);
            return;
        }
        else{
            console.log(`DEBUG: Wrong password`);
            res.send('Login failed, wrong username or password');
            return;
        }
    }
});


// Privileged route
app.get('/profile', function(req, res) {
    /*
    * Check for session cookie from header.
    * If not authenticated: redirect to /login
    */
    //else: Send user data.

    // res.sendFile(`${__dirname}/static/profile.html`);
    // TODO: Understand how much frontend-functionality should I incorporate...
    // To get a more professional profilepage I would consider templates, EJS sounds good
    // On the other hand, it is irrelevant for CSRF. Simpler to just send a template string
    
    let username = `Admin`;
    let mail_address = `admin@webapp.com`;
    // TODO: Fetch userinfo from memory/database, use session cookie as key
    // Pseudokode: SELECT username, mail_address FROM table WHERE session_cookie IS req.session-cookie

    res.send(`<h3>Hello ${username}! Welcome to the profile page! Your email address is: ${mail_address}</h3>`)
});


app.post('/profile/change-email', function(req, res) {
    // handle incoming data, rewrite stuff... OKEY

    // Check for session cookie in header
    // If not authenticated:
    // redirect to /login, return back to profile

    const new_address = req.body.email;
    res.send(`<h3>Thank you, [username], the email-address was changed to: ${new_address}`);
});


// ENV port is the clean way to do it, can be set on server by running $ export PORT=5000
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}`));