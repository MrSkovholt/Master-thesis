/*
Very secure webapp with login-functionality. Secured against CSRF, but the 
backend is a MongoDB-database, what about authentication-bypass? Hmmmmge
Credit where credit is due, parts of the code is taken from npmjs.com/package/express-session 

** For testing and demo purposes **
*/

var escapeHtml = require('escape-html')
var express = require('express')
var session = require('express-session')
var { randomBytes } = require('crypto')

// TODO BEEP BEEP REWRITE TO USE noSQL! :)
const mongoose = require('mongoose')
const { isUndefined } = require('util')
// Prøver oss forsiktig på noe mer nå
//const MongoClient = require('mongodb').MongoClient;


var app = express()

app.use(express.json())
// REMOVING THIS WILL EFFECTIVELY REMOVE THE OPPORTUNITY TO SEND JSON IN POST-REQUESTS!

// TODO: Read more about possible options here. 
app.use(session({
  secret: 'Marlinspike Hall',
  resave: false,
  saveUninitialized: true,
  //sameSite: 'strict'  // Does not have any effect. Maybe because everything runs on localhost? Don't really know for sure. TODO: FIND OUT 
}))
// Secret question: Where does Captain Haddock live?


// middleware to test if authenticated
function isAuthenticated (req, res, next) {
  if (req.session.user) next()  //next('route') // like i thought, this terminates the callbacks. Means that login is impossible. 
  else next('route')
}

/*
You can provide multiple callback functions that behave like middleware to handle a request. 
*** The only exception is that these callbacks might invoke next('route') to bypass the remaining route callbacks. ***

You can use this mechanism to impose pre-conditions on a route, then pass control to subsequent routes if there’s 
no reason to proceed with the current route.

Basically: A return/escape/terminate route handling. Makes sense
*/

function testCallback(req, res, next){
    // For some reason, (next) does not work, but (req, res, next) works even though the first two arguments are unused. Weird. 
    console.log("I was called!")
    next()
    // To use this function as a callback, simply put it as an argument to a route
}


app.get('/', isAuthenticated, function (req, res) {
  /* 
  This is only called when there is an authenticated user due to isAuthenticated
  
  * Check if csrf-token exists in the user-session cookie, then use this to secure the passwordchange-form
  * Finally: "Render" the webpage (send the raw html)
  */

  if (req.session.csrf === undefined){
    req.session.csrf = randomBytes(40).toString('base64');  // converts some random data to a string
    // The data does not really have to be cryptographically secure, just very hard to guess.
    // "Homebrewed" crypto is okay, iguess? 
    //console.log("Getting homepage, csrf-token is: " + req.session.csrf)
  }


  res.send('<h1>Super secure webapp welcomes you!</h1>' +
    'hello, ' + escapeHtml(req.session.user) + '! ' +
    '<a href="/logout">Logout</a>' + 
    '<form action="/passwordchange" method="post">' +
    '<input type="hidden" name="_csrf" value=' + escapeHtml(req.session.csrf) + '>' +
    '<h2>To change your password, use the form below</h2>' +
    'Password: <input name="pass" type="password"><br>' +
    'Confirm password: <input name="confirmpass" type="password"><br>' +
    '<input type="submit" name="btnChange" value="Change password"></form>')
})


app.get('/', function (req, res) {
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
  console.log(`DEBUG: Getting userdata, preparing to execute query looking for user ${req.body.user}...`)

  // OG proper way to handle this?
  //const result = await con.findOne({ username: `${username}` });
  
  // Kanskje jeg heller skal skrive om og "gjøre det lett og gæli"?
  // req.body.<name, password>
  
  const result = await con.find({ "username": req.body.user, "password": req.body.pass  }).limit(1);

  if(true){
    console.log(`DEBUG: QUERY RESULT`)
    console.log(result)
  }

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
  console.log("Attempting to validate user...")
  console.log(`Username: ${req.body.user}`)
  console.log(`Password: ${req.body.pass}`)
  
  let user = await getUser(req, con)
  console.log("*** ValidateUser: USER ***")
  console.log(user)

  if(user.length === 0){
    console.log("DEBUG: Username and/or password invalid...")
    //console.log(`DEBUG: Cannot validate nonexisting user...`)
    return false
  }

  return true;

  console.log(`DEBUG: Validating user credentials...`)
  //console.log(user.username, user.password)

  return (username === user.username && password === user.password)
}


app.post('/login', express.urlencoded({ extended: false }), function (req, res) {
  const uname = req.body.user;
  const password = req.body.pass;

  // console.log(req) // gives wayyyyyy to much information to be useful
  console.log("DEBUG: req.body:")
  console.log(req.body)
  console.log(req.body[0])
  //console.log(req.body[0].username)
  // OH MY FRICKIN GOD, THE VALUES IN THE BODY ARE STRINGIFIED, SO THE EXPLOIT DOES NOT WORK!

  //Maybe i could parse them and see where that gets me?


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


// TODO FEATURE TO REALLY BRING HOME THE CSRF THINGY:
async function updatePassword(username, password, con){
  /*
  Update record in database! :) 
  */

  let sql_query = `UPDATE users SET password=? WHERE username=?`;
  console.log(`DEBUG: Preparing to execute to update database...`)

  const result = await con.query(sql_query, [password, username]);
  // include some error handling here? Throw err and return and whatnot?

  let userdata = Object.values(result[0])
  console.log(userdata[3])
  // SHOULD ALWAYS BE: "Rows matched: 1  Changed: 1  Warnings: 0"
  return true
}


app.post('/passwordchange', isAuthenticated, express.urlencoded({ extended: false }), function (req, res) {
  // apparently express.urlencoded(...) is necessary to parse the req.body? Get undefined otherwise. 
  // NO clue what this means
  /*
  Change password for a logged in user, run DB query.

  TODO:
  (?) Invalidate cookies for user? Or not. For demo purposes, this works.
  */
  console.log("DEBUG: Attempting to change password")
  let pass1 = req.body.pass

  if( pass1 !== pass2){
    // passwords don't match
    res.send(`Given passwords don't match, try again. <a href="/">Click here to navigate back</a>`)
  }
  else{
    // TODO: Validate CSRF-tokens before passwordchanges
    console.log("DEBUG: VALIDATING CSRF-TOKENS")
    console.log("DEBUG: SESSION-CSRF = " + req.session.csrf)
    console.log("DEBUG: FORM-CSRF = " + req.body._csrf)

    if(req.session.csrf !== req.body._csrf){
      // TODO: This should be its own function, to validate csrf-tokens on all relevant requests
      console.log("ERROR! CSRF-tokens do not match")
      res.send(`Password-change failed, please contact our customer-support :)`)
    }
    else {   
      // fetch user object and overwrite password
      let username = req.session.user
      
      let changed = updatePassword(username, pass1, global.con)
      changed.then( function () {
        console.log(`DEBUG: Password changed for ${username}`)
        res.send(`Password changed successfully! <a href="/">Click here to navigate back</a>`)
      })
    }
  }
})


// git checkout dev && git merge changepassword && git push && git checkout changepassword
app.get('/logout', function (req, res, next) {

  console.log("DEBUG: User logging out")

  // clear the user from the session object and save.
  // this will ensure that re-using the old session id does not have a logged in user
  req.session.user = null
  req.session.save(function (err) {
    if (err) next(err)

    // regenerate the session, which is good practice to help
    // guard against forms of session fixation
    req.session.regenerate(function (err) {
      if (err) next(err)
      res.redirect('/')
    })
  })
})

/* TEST-CASES */
async function test_false(con){
  // Verify handling of incorrect uname/pw combo
  const test_validated_false = await validateUser("Sindre", "SOME_INCORRECT_PASSWORD", con);

  if(test_validated_false) console.log("SEND: CREDENTIALS OK! :)")
  else console.log("SEND: CREDENTIALS NOT OK! :(")  // This is the expected result ofc
}

async function test_true(con){
  // Verify handling of correct uname/pw combo
  const test_validated_true = await validateUser("admin", "adminPassword", con);
  
  if(test_validated_true) console.log("SEND: CREDENTIALS OK! :)")  // This is the expected result
  else console.log("SEND: CREDENTIALS NOT OK! :(")
}


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
  
  // Delete users with code
  if (false){
    await User.deleteMany({ username: /Sindre/});
    console.log(await User.find())
    
    await User.deleteMany({ username: /admin/});
    console.log(await User.find())
  }

  // Create users with code, to populate database
  if (false){
    let sindre = new User({ username: 'Sindre', password: "sindrePassword" });
    await sindre.save()
    
    let admin = new User({ username: 'admin', password: "adminPassword" });
    await admin.save()
  }

  /* More testing:
  const users = await User.find();
  console.log(users)

  console.log("Fetching user-record based on username:")
  const user = await User.find({ username: 'Sindre'})
  console.log(user[0])
  console.log(`User password is: ${user[0].password}`)
  */

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
  
    The funny stuff is not passwordchanges, but rather...
  * We go exploitin' bois!
  */

}

async function testingQueries(){
  /*
  Simple async function to test different insecure queries
  All 3 different ways work as expected. Nice
  Remember that async-calls if not handled properly will give wonky output!
  IE. db.find() gives the database information, possibly because you log a promise and not the info..? 

  */

  console.log("Genuine way to fetch all users:")
  const users = await global.mongoose_model.find() 
  //console.log("MAIN HENTER DATA FRA DATABASE WOOH")
  console.log(users)

  // testing possibly insecure query
  console.log("Testing insecure queries")
  // V1 - works...
  await global.mongoose_model.find({ username: {"$gt": ""}, "password": {"$gt": ""} }, function(err, users) {
    console.log("V1:\nTesting objects directly in query")
    console.log(users)
    console.log("V1 done")
  }).clone()
  
  let param_username = {"$gt": ""}
  let param_password = '{"$gt": ""}'

  // V2: 
  await global.mongoose_model.find({ username: param_username, "password": param_password}, function(err, users) {
    console.log("V2:\nUsing variable-objects as parameters")
    console.log(users)
    console.log("V2 done")
  }).clone()


  // V3 -
  let found_users = await global.mongoose_model.find({ "username": param_username, "password": param_password }).clone()
  console.log("V3:\nTesting return values from db.find()")
  console.log(found_users)
  console.log("V3 done")
  // without the await, I log a promise, and it looks weird.
}

async function main(){
  
  global.mongoose_model = await dbSetup();
  /*
  // Basic testing:
  await test_false(con)
  await test_true(con)
  console.log('')
  */
  
  if(true){
    await testingQueries()
    console.log("DEBUG: testingQueries DONE")
  }

  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`App listening on port ${port}`));

  //clean(con);
  //console.log(`Program '${__filename.split(`/`).pop()}' terminating...`)
}

main().catch(err => console.log(err));