# GREETINGS AND SALUTATIONS 

This is the readme for the CSRF-demo, with the intention of this being a prototype for all my future projects related to my master thesis.
The readme should contain a step-by-step guide on how to run the demo, and how to exploit it, preferrably with examples of expected results and stuff.

1. How to run.
- Usually run with:
<code>$ node <my_project_file>.js</code>
or
<code>$ nodemon <my_project_file>.js</code>
... if you wanna monitor for changes.

2. How to use
- Depends on the project

3. How to abuse
- Depends on the project

4. How to verify result
- Depends on the project


## CSRF-vulnerable demo.js

### Prerequisites:
Have a mySQL-database installed, called "mydb", containing the table "users". Table users must have fields | "username" | "password | 
Also having some database entries (user data) is necessary.

**1. How to run:**

Run the demo.js file:
<code>$ node demo.js</code>
Then, verify from the terminal output that the execution went well, what possible credentials are and so on.

**2. How to use:**

Go to http://127.0.0.1:3000
Log in with credentials. They are supplied in the initial output when the program is run. 
... The user-functionality gives the option to change password, and to log out. NB: The user must be logged in to do this! 

**3. How to abuse:**

Run the exploitpage.js file:
<code>$ node exploitpage.js</code>
And verify that it works. 
The user logged in on the webapp will then visit the exploitpage at http://127.0.0.1:4444 and see the glorious picture of Tintin and Terry
To simulate the attacker: Open an incognito tab, to not use the stored session cookie. 
Log in with the username of the user (i.e. Sindre) and the password "PWN"

**4. How to verify the result:**

See that the password is changed from "sindrePassword" to "PWN", and that the "attacker" in the incognito-tab has compromised the account.
In the terminal belonging to demo.js, see that the debug information indicates this aswell.

### **...Profit**

## CSRF-mitigation

To see an example of how this vulnerability can be mitigated, follow the guide above, but run <code>safe_demo.js</code> instead of <code>demo.js</code>

  

The output will be: 
> DEBUG: Attempting to change password
>
> DEBUG: VALIDATING CSRF-TOKENS
>
> DEBUG: SESSION-CSRF = g67XL2XokUQ8Y45NPc6cYcEpS3kuV4c/SQxlo1bmGZthx1nnKNYAQw==
>
> DEBUG: FORM-CSRF = undefined
>
> ERROR! CSRF-tokens do not match
