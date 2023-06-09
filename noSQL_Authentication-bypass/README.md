# Demonstration of noSQL authentication-bypass

#### Tl;dr: This demo is in essence the webapp where I implemented CSRF-tokens, but with a noSQL-backend instead of regular mySQL

### Prerequisites:
Setting up a noSQL database, I'm using mongodb. 
I've had some troubles doing this, but let's see how it goes, shall we?
- sudo apt install mongodb, turns out that is version 3.6.something
- systemctl-service is called <mongodb>, not <mongod> as many guides refer to it. Might be version-dependent. 
Following this guide led to great success: https://www.cherryservers.com/blog/how-to-install-and-start-using-mongodb-on-ubuntu-20-04
<code>
serversideJS-thesis git:(noSQL) mongo --eval 'db.runCommand({ connectionStatus: 1 })'
MongoDB shell version v3.6.8
connecting to: mongodb://127.0.0.1:27017
Implicit session: session { "id" : UUID("1c14fd52-e516-4ce2-af16-64448624afe0") }
MongoDB server version: 3.6.8
{
	"authInfo" : {
		"authenticatedUsers" : [ ],
		"authenticatedUserRoles" : [ ]
	},
	"ok" : 1
}
</code>

<code> ... user: "sindre",
... pwd: "sindreMongoDB",
... roles: [ { role: "readWrite", db: "users" } ]
... }
... )
Successfully added user: {
	"user" : "sindre",
	"roles" : [
		{
			"role" : "readWrite",
			"db" : "users"
		}
	]
}

db.createUser(
  {
    user: "Admin",
    pwd: "mongoAdmin",
    roles: [ { role: "userAdminAnyDatabase", db: "admin" }, "readWriteAnyDatabase" ]
 }
)


HOW TO LOG INTO DATABASE:
$ mongo 127.0.0.1 --port 27017 -u 'Admin' -p 'mongoAdmin' --authenticationDatabase 'admin'

> db.webapp_users.find()
{ "_id" : ObjectId("62fe3ecb30ce2afd1fcf87ed"), "username" : "admin", "password" : "adminPassword" }
{ "_id" : ObjectId("62fe3ed830ce2afd1fcf87ee"), "username" : "sindre", "password" : "sindrePassword" }


Ideelt sett burde jeg hatt 
database: webapp
collection (samme som SQL table): users
</code>
 

**1. How to run:**

Run the demo.js file:
<code>$ node demo.js</code>
Then, verify from the terminal output that the execution went well, what possible credentials are and so on.

**2. How to use:**

Go to http://127.0.0.1:3000
Log in with credentials for the user Sindre. They are supplied in the initial output when the program is run. 
The user-functionality gives the option to change password (NOT IMPLEMENTED), and to log out. NB: The user must be logged in to do this! 

**3. How to abuse:**
Say that we want to get access to the administrator-account on the webapp, but don't know the password. What do we do? Find a payload for a noSQL authentication-bypass!

See supplied bypass_request.http
Burpsuite is nedded

3.1 Fire up burpsuite, and use the integrated browser to access the webapp at localhost:3000
3.2 Activate the "intercept"-function in Burp
3.3 Attempt to log in with "admin:wrongpassword"
3.4 Replace the request that gets intercepted, with the request supplied in <bypass_request.http>
3.5 Profit

**4. How to verify the result:**
See that you managed to log in without the admin-password, but rather by messing with the MongoDB/mongoose-query.

### **...Profit**


------------------------------------------------------------

## Mitigation

Sanitize the userinput before running the query?
