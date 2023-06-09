// Parts of the code is taken npmjs.com/package/express-session 
//  ** For testing and demo purposes **

// The file demo.js is a CSRF-vulnerable webapp  
// Next up: Mitigate CSRF-vulnerability...
// PROFIT...!

// Then use this app as a basis to experiment with noSQL+authentication-bypass

/* NOTES:
 * Not clear how the session data is stored on the server. Weird.
 * Something about a session store? Idk how interesting that is.  
 *
 */

var escapeHtml = require('escape-html')
var express = require('express')
var session = require('express-session')
/*
*** From https://github.com/expressjs/session ***
Warning: The default server-side session storage, MemoryStore, is purposely not designed 
for a production environment. It will leak memory under most conditions, does not scale past 
a single process, and is meant for debugging and developing.

- Still, this is not relevant for my project
*/

var mysql = require('mysql2/promise')
var { randomBytes } = require('crypto')

var app = express()

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


async function getUser(username, con){

  let sql_query = `SELECT * FROM users WHERE username=?`;
  console.log(`DEBUG: Getting userdata, preparing to execute query...`)

  const result = await con.query(sql_query, [username]);

  if(result[0].length < 1){
    console.log(`DEBUG: USER NOT FOUND...`)
    return undefined
  }
  console.log(`DEBUG: FOUND USER IN DATABASE`)
  //console.log(result[0])

  let userdata = Object.values(result[0])

  return userdata[0]
  // returns object {id, username, password}
}


async function validateUser(username, password, con) {
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
  console.log("\nAttempting to validate user...")
  let user = await getUser(username, con)

  if(user === undefined){
    console.log(`DEBUG: Cannot validate nonexisting user...`)
    return false
  }

  console.log(`DEBUG: Validating user credentials...`)
  //console.log(user)

  let values = Object.values(user)

  const db_uid = values[0]
  const db_uname = values[1]
  const db_pw = values[2]
  
  // This is used purely for testing purposes
  console.log(`DEBUG: db_uid, db_uname, db_pw:`)
  console.log(db_uid, db_uname, db_pw)
  console.log(`DEBUG: Supplied credentials:\nUsername: ${username}\nPassword: ${password}`)

  return (username === db_uname && password === db_pw)
}


function clean(con){
  // Not used, server runs forever until terminated with force. CTRL+C
  // The server could be extended with a connect/disconnect call for each user-action. 
  console.log(`DEBUG: Closing connection!`)
  con.end();
}


app.post('/login', express.urlencoded({ extended: false }), function (req, res) {
  const uname = req.body.user;
  const password = req.body.pass;
  console.log("DEBUG: ATTEMPTING LOGIN")
  
  const validated = validateUser(uname, password, global.con)
  validated.then( validated => {
    // Might be a smoother way to handle it, but this works.

    if(!validated){
      res.send(`Login failed, wrong username or password. Click <a href="/">HERE</a> or navigate back to try again`);
    }
    else{
      console.log(`DEBUG: Login successful`)
      // Success: Fix session cookies and all that jazz
      // regenerate the session, which is good practice to help guard against forms of session fixation
      req.session.regenerate(function (err) {
        if (err) next(err)
        // Weird? Afaik means the error will be passed to express to be handled
        // "store user information in session, typically a user id"
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
  let pass2 = req.body.confirmpass

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


async function createDB(){
  // Connection setup to locally running database
  const con = await mysql.createConnection({
    host: "localhost",
    user: "sindre",
    password: "SindrePassword",
    database: "mydb"
  });
  
  console.log(`(2) Connection data written...`)

  con.connect( (err) => {
    if (err) throw err;
    console.log(`Connected!`);
  })
  console.log(`(3) Creating connection to DB...`)
  return con;
}
// maybe connection pool thingy is the way to go?

// Assume database exists - I have created one in the VM

async function main(){
  //const con = await createDB(); 
  // Kleep as global variable, send as argument, or connecting/disconnecting every time a query is made?
  
  // Currently using global variable. Maybe a bit of technical debt incoming, but is sufficient for coding purposes
  global.con = await createDB();

  await test_false(con)
  await test_true(con)
  console.log('')

  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`App listening on port ${port}`));

  //clean(con);
  //console.log(`Program '${__filename.split(`/`).pop()}' terminating...`)
}

main();