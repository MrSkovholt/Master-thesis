// Demo for database usage
// Credits to W3schools

var mysql = require('mysql2/promise');

console.log(`(1) Setting up connection data...`)

async function createDB(){
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


// mysql> CREATE USER 'sindre'@'localhost' IDENTIFIED BY 'SindrePassword';
// Prøve sindre:SindrePassword -> error, connection ikke tillatt. 
// Error: Access denied for user 'sindre'@'localhost' to database 'mydb'
// ... Men det funker når jeg logger inn direkte med CLI what. 
// GRANT ALL PRIVILEGES ON *.* TO 'sindre'@'localhost' 
// -> Now it works... But ehum, now sindre effectively is root also. Whoops

// prøve: root:RootPassword -> Connected, database created. 

// Set up database: mysql> CREATE DATABASE mydb ;



// Created SQL database in the terminal, 
// Next up: Rewriting the login-page to use the database instead. 
// TODO: Consider using docker, so I can keep the database in the github repo, so to say...
// Sounds good.

//let sql_query = "CREATE TABLE customers (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), address VARCHAR(255))";
//let sql_query = "INSERT INTO customers (name, address) VALUES ('Company Inc', 'Highway 37')";


/*
NB NB *** HOW TO USE DATABASE *** NB NB
Save two google searches, to run mysql in terminal to verify content:
mysql [-u <username>] -p
mysql > show databases;
mysql > use mydb;
mysql > SHOW TABLES;
mysql > SELECT * FROM users;
.. PROFIT
*/

async function getUser(username, con){

  let sql_query = `SELECT * FROM users WHERE username=?`;
  console.log(`(5) Preparing to execute query...`)

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
  
  console.log(`DEBUG: db_uid, db_uname, db_pw:`)
  console.log(db_uid, db_uname, db_pw)
  console.log(`DEBUG: Supplied credentials:\nUsername: ${username}\nPassword: ${password}`)

  return (username === db_uname && password === db_pw)
}


function clean(con){
  // cleanup
  console.log(`(7) Closing connection, have a good day!`)
  con.end();
}

async function test_false(con){

  const test_validated_false = await validateUser("Sindre", "SOME_INCORRECT_PASSWORD", con);

  if(test_validated_false) console.log("SEND: CREDENTIALS OK! :)")
  else console.log("SEND: CREDENTIALS NOT OK! :(")
}


async function test_true(con){

  const test_validated_true = await validateUser("admin", "adminPassword", con);
  
  if(test_validated_true) console.log("SEND: CREDENTIALS OK! :)")
  else console.log("SEND: CREDENTIALS NOT OK! :(")
}

async function main(){
  const con = await createDB();

  await test_false(con)
  await test_true(con)
  console.log('')

  clean(con);
  console.log(`Program '${__filename.split(`/`).pop()}' terminating...`)
}

main();