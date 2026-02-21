const express = require('express')
const cors = require('cors') 
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express()
const port = 3000 
app.use(cors()) 
app.use(express.json())
 


const uri = `mongodb+srv://${process.env.DB_USERS}:${process.env.DB_PASSWORD}@cluster0.e1kqjp5.mongodb.net/?appName=Cluster0`;


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});



app.get('/', (req, res) => {
  res.send('Hello World!')
}) 



async function run() {
  try {  
 await client.connect();

 const BoighorDB = client.db('BoighorDB')
 const BoighorCollection =BoighorDB.collection('BoighorCollection') 

 
 app.post('/books',async(req,res)=>{
     const book=req.body 
     const result= await BoighorCollection.insertOne(book)
     res.send(result)
 }) 

 app.get('/books',async(req,res)=>{ 
   const query=req.query
   const result=await BoighorCollection.find().toArray()
   res.send(result)
 }) 

 app.get('/books/:id',async(req,res)=>{
   const id=req.params.id 
   const query={_id:new ObjectId(id)}
   const result=await BoighorCollection.findOne(query)
    res.send(result)
 })









    // Connect the client to the server	(optional starting in v4.7)
    
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
