const express = require('express')
const app = express(); 
app.use(express.json());
const path = require('path'); 
const {open} = require('sqlite'); 
const cors = require("cors");
const sqlite3 = require('sqlite3'); 
const dbpath = path.join(__dirname, 'database.db'); 
app.use(cors()); 
const bcrypt = require("bcrypt"); 
const jwt = require("jsonwebtoken");
let db ; 
const dbInitalization = async () => {
    try{
    db= await open({
    filename: dbpath, 
    driver: sqlite3.Database 
    })
    await db.run(
        `
        create table if not exists users(
            id integer primary key autoincrement,
            name varchar(500), 
            password text, 
            email text
        ); 
        `
    )
    app.listen(5000,()=>{
        console.log('database is connected 5000 port on running')
    })
}
catch(e){
    console.log(`database is not connected why ${e.message}`)
}
} 

app.post('/register', async (request, response) => {
    const {name,password, email} = request.body; 
    const query = `
        select * from users 
        where email = '${email}' 
    ` 
    const res = await db.get(query); 
    if(res !== undefined){
        response.status(400).send('user already exist');
    }else{
        const hashedpassword = await bcrypt.hash(password, 5); 
        const insertquery = `
            insert into users(name, password, email) values(
            '${name}', 
            '${hashedpassword}', 
            '${email}'
            ); 
        `  
        const res = await db.run(insertquery); 
        response.status(200).send(`user successfully registrated ${res.lastID}`); 

    }
})

app.post('/login', async(request, response) => {
    const {name, password, email} = request.body; 
    const temres = `
        select * from users 
        where email = '${email}'; 
    `
    const results = await db.get(temres); 
    if(results === undefined){
        response.status(400).send("the user not registered yet now"); 
    }else{
        const verifypassword = await bcrypt.compare(password, results.password);
        if(verifypassword === false){
            response.status(400).send('invalid password')
        }else{
            const payload = {
            name: name, 
            password: password
        }
        const jwttoken = jwt.sign(payload, 'abbas');
        response.status(200).send({jwttoken});
        } 

    }
    
})

const middleware = (request, response, next) => {
    let jwtauthor ; 
    const jwtauthortoken = request.headers["authorization"]; 
    if(jwtauthortoken !== undefined){
        jwtauthor = jwtauthortoken.split(" ")[1]; 
    }
    if(jwtauthor === undefined){
        response.status(400).send("invalid jwt token")
    }else{
        jwt.verify(jwtauthor, 'abbas' , async (error, payload) => {
            if(error){
                response.status(400).send("invalid jwt token")
            }else{
                next(); 
            }
        })
    }
}

app.get('/getusers', middleware, async (request, response) => {
   const query =   `
    select * from users
   `
   const res= await db.all(query); 
   response.status(200).send(res); 
})

app.get('/oneuser/:id', middleware,  async(request, response) => {
    const {id} = request.params;  
    const query = `
        select * from users where id = '${id}'; 
    `
    const res = await db.get(query); 
    response.send(res); 

}) 

app.put('/updatation/:id', middleware, async (request,response) => {
    const {id} = request.params; 
    const {name} = request.body; 
    const query = `
    update 
    users 
    set name = '${name}'
    where id = ${id}; 
    `
    const res = await db.run(query); 
    response.status(200).send("user successfully updated"); 
})

app.delete('/delete/:id', middleware, async (request, response) => {
    const {id} = request.params; 
    const query = `
    delete from users 
    where id = ${id}; 
    `

    const res = await db.run(query)
    response.status(200).send("user successfully deleted") 
})
dbInitalization(); 