
const express = require("express")
const bodyParser = require("body-parser")
const app = express()
const multer  = require('multer')
const bcrypt = require('bcrypt')
const cors = require("cors")
const db = require('knex')({
    client: 'pg',
    connection: {
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false
        }
    
    }
});
let valid = false
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads')
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() +  file.originalname)
    }
})
function fileFilter (req, file, cb) {
    
    if (file.mimetype === "image/jpeg" || file.mimetype === "image/png" ) {
          
        valid = true
        cb(null, true)
    }else {
        cb(null, false)
    }
}
const upload = multer({
   storage,
   fileFilter
})

app.use(bodyParser.json())
app.use("/uploads",express.static('./uploads'))
app.use(cors())


app.get("/" ,(req,res)=>{
     res.json("Home")
}) 

app.post("/register",upload.single('profileImg'),( req, res ) => {
    const { name, email, password } = req.body
    if (!email && !password && !name ){
        return res.status(400).json("incorrect form submission")
    }
    const image = valid ? req.file.path : ""
    const hash =  bcrypt.hashSync(password, 10)
    db.transaction((trx) => {
        trx.insert({ email:email, password:hash })
        .into("login")
        .returning("email")

        .then(data =>{
            return trx("userinfo")
            .returning("*")
            .insert(
            {   email:data[0 ],
                profile:image,
                fullname:name
            })
            .then(data => {
                res.json(data[0])
            })
            .catch(er =>res.json("Unable to get user"))
        })
        .then(trx.commit)
        .catch(trx.rollback);
    })
    .catch(err=>res.status(400).json("Unable to register"))
  
})

app.post("/signin",( req,res ) => {
    const { password , email } = req.body
    db.select("*").from("login").where( { email:email }) 
    .then( data => {
        const hash = data[0].password
        const isValid = bcrypt.compareSync(password,hash)
        if ( isValid ) {
            db.select("*").from("userinfo").where( { email : email })
            .then(user => {
                res.json(  user[0] )
            })
            .catch(er => res.json("Unable to get user"))
        }else{
        res.status(400).json("Wrong credentials")
        }
        
    }) 
    .catch(er => res.status(400).json("Wrong credentials"))
})

app.get("/profile/:id", ( req, res ) => {
    const { id } = req.params
    db.select("*").from("userinfo").where( { id:id } )
    .then(user => { 
        if( user.length ) {
            res.json(user[0])
        }else{
            res.status(400).json("No user found")
        }
    })
    .catch(er => res.status(400).json("Error getting user"))
})

const PORT = process.env.PORT
app.listen(PORT || 3000,()=>{
    console.log(`I'm Listening to port ${PORT}`)
})


