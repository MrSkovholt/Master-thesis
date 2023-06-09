/*
Not so secure webapp with login-functionality. NodeJS and MongoDB are hot technologies, but what happens when developers don't know how to use them properly?
Credit where credit is due, parts of the code for is taken from npmjs.com/package/express-session 
** For testing and demo purposes **
*/

var escapeHtml = require('escape-html')
var express = require('express')
var session = require('express-session')
var { randomBytes } = require('crypto')

const mongoose = require('mongoose')
const { isUndefined } = require('util')

var app = express()

app.use(express.json()) // REMOVING THIS WILL EFFECTIVELY REMOVE THE OPPORTUNITY TO SEND JSON IN POST-REQUESTS, DISABLING THE BYPASS

app.use(session({
  secret: 'Marlinspike Hall',
  resave: false,
  saveUninitialized: true,
}))
// Secret question: Where does Captain Haddock live?


function isAuthenticated (req, res, next) {
  if (req.session.user) next()  //next('route') terminates the callbacks. Means that login is impossible. 
  else next('route')
}

/*
You can provide multiple callback functions that behave like middleware to handle a request. 
*** The only exception is that these callbacks might invoke next('route') to bypass the remaining route callbacks. ***
You can use this mechanism to impose pre-conditions on a route, then pass control to subsequent routes if there’s 
no reason to proceed with the current route.
Basically: A return/escape/terminate route handling. Makes sense
*/


app.get('/', isAuthenticated, function (req, res) {
  /*
  This is only called when there is an authenticated user due to isAuthenticated middleware  
  * Check if csrf-token exists in the user-session cookie, then use this to secure the passwordchange-form
  * Finally: "Render" the webpage (send the raw html)
  */

  if (req.session.csrf === undefined){
    req.session.csrf = randomBytes(40).toString('base64');
    // "Homebrewed" solution is OK. The data does not really have to be cryptographically secure, just very hard to guess. Randombytes = OK.
  }

  // TODO: Find a nice way to include a flag or something funny? Or just say... whatever. Not important. Logging in as admin is the important thing. 
  // IDEA: Add flag to admin MongoDB document, put in session, send here... Mjeh whatever
  res.send('<h1>Super secure webapp welcomes you!</h1>' +
    'hello, ' + escapeHtml(req.session.user) + '! ' +
    'Your secret value is * FLAG HERE * ' +
    '<a href="/logout">Logout</a>')
  })


app.get('/', function (req, res) {
  /*
  Frontpage for unauthenticated users - I.e. Login-page
  */
  res.send('<h1>Welcome to the super secure webapp</h1>' +
    '<form action="/login" method="post">' +
    'Username: <input name="user"><br>' +
    'Password: <input name="pass" type="password"><br>' +
    '<input type="submit" name="btnLogin" value="Login"></form>')
})


async function getUser(req, con){
  /* Queries DB, returns data to validateUser() to validate login
  
  @Return:
    @Ret1: undefined, if user is not found
    @Ret2: result:object, if userdata is found. validateUser processes the data.
  */
  // Originally only searched for username, and compared passwords afterwards - a safer way to do so.
  // const result = await con.findOne({ username: `${username}` });
  
  const result = await con.find({ "username": req.body.user, "password": req.body.pass  }).limit(1);
  return result
  // returns object {id, username, password}
}


async function validateUser(req, con) {
  /*
  Fetches user record from DB and compares credentials to the supplied

  @Args: 
    @Arg1: username:String - username from user-request
    @Arg2: password:string - password from user-request
    @Arg3: con:object - reference to database connection

  @Return:
    @Ret1: true if user is found and credentials match
    @Ret2: false if user not found, or if credentials don't match
  */
  if(false){
    console.log("Attempting to validate user...")
    console.log(`Username: ${req.body.user}`)
    console.log(`Password: ${req.body.pass}`)
  }
  
  let user = await getUser(req, con)
  
  console.log("*** ValidateUser: USER ***")
  console.log(user)
  if(user.length === 0){
    console.log("DEBUG: Username and/or password invalid...")
    return false
  }

  // Mitigating vulnerability: Comparison will fail, authentication bypass does not work.
  console.log(`DEBUG: Validating user credentials...`)
  return (username === user.username && password === user.password)
}


app.post('/login', express.urlencoded({ extended: false }), function (req, res) {
  const uname = req.body.user;
  const password = req.body.pass;

  console.log("\nDEBUG: ATTEMPTING LOGIN")
  
  const validated = validateUser(req, global.mongoose_model)
  validated.then( validated => {
    // Might be a smoother way to handle it, but this works.

    if(!validated){
      console.log("DEBUG: Login failed")
      res.send(`Login failed, wrong username or password. Click <a href="/">HERE</a> or navigate back to try again`);
    }
    else{
      console.log(`DEBUG: Login successful`)
      // Success: Fix session cookies and all that jazz
      req.session.regenerate(function (err) {
        if (err) next(err)
        req.session.user = req.body.user
        // save the session before redirection to ensure page load does not happen before session is saved
        req.session.save(function (err) {
          if (err) return next(err)
          res.redirect('/')
         })
       })
     }
   })
})


app.get('/logout', function (req, res, next) {
  console.log("DEBUG: User logging out")

  // clear the user from the session object and save.
  // this will ensure that re-using the old session id does not have a logged in user
  req.session.user = null
  req.session.save(function (err) {
    if (err) next(err)

    // regenerate the session, which is good practice to help guard against forms of session fixation
    req.session.regenerate(function (err) {
      if (err) next(err)
      res.redirect('/')
    })
  })
})


// Assume database exists - I have created one in the VM
async function dbSetup(){
  // Trying to set up the mongoDB-database, and play around for a bit with queries and such
  // From: mongoosejs.com/docs/
  // Testing that database-connection works
  
  await mongoose.connect('mongodb://localhost:27017/users')
  
  const userSchema = new mongoose.Schema({
    username: String,
    password: String
  });

  const User = mongoose.model('User', userSchema);
  // each user is represented by a document, and users have properties and behaviors as declared in our schema.

  return User
  // seems like the mongoose-model is equivalent to the mysql-connection from the mysql-example

  /*
  TODO:
  
  * Return mongoose model <=> return mySQL-connection
    -> Save Mongoose model in global scope
    -> Rewrite functions to use mongoose-model instead of mySQL-connection
    -> Rewrite queries to use mongoose and noSQL-queries instead of mySQL queries
  
  * IMPORTANT: Make the queries insecure, lol. Plug userinput directly into the queries etc.
  -> Primary focus: Login functionality, passwordchange not as important
  
  */

}


async function main(){
  
  global.mongoose_model = await dbSetup();
  
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`App listening on port ${port}`));
}

main().catch(err => console.log(err));