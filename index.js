const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USERS}:${process.env.DB_PASSWORD}@cluster0.e1kqjp5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let BoighorCollection; 
let userCollection
let cartCollection

async function run() {
  try {
    await client.connect();
    const BoighorDB = client.db('BoighorDB');
    BoighorCollection = BoighorDB.collection('BoighorCollection');
    userCollection=BoighorDB.collection('users')
    cartCollection=BoighorDB.collection('cart')
    console.log("MongoDB Connected Successfully!");
  } catch (error) {
    console.error("MongoDB Connection Failed:", error);
  }
}
run().catch(console.dir);


app.get('/books', async (req, res) => {
  try {
    if (!BoighorCollection) {
      return res.status(500).send({ message: "Database not connected yet" });
    }
    const result = await BoighorCollection.find().toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.get('/', (req, res) => {
  res.send('Server is running');
}); 

app.get('/books/:id',async(req,res)=>{
     const id=req.params.id
     const query={_id:new ObjectId(id)}
     const result=await BoighorCollection.findOne(query)
     res.send(result)
}) 

app.delete('/books/:id',async(req,res)=>{
    const id=req.params.id 
     const query={_id:new ObjectId(id)} 
     const result=await BoighorCollection.deleteOne(query)
     res.send(result)
}) 

app.patch('/books/:id',async(req,res)=>{
    const id=req.params.id 
    const updatedData=req.body 
    const query=-{_id:new ObjectId(id)} 
    const updateDoc={
       $set:{
          
           title:updatedData.title,
           author:updatedData.author,
           category:updatedData.category,
           price:updatedData.price,
           discountPrice:updatedData.discountPrice,
          stock:updatedData.stock,
          image:updatedData.image,
          shortDescription:updatedData.shortDescription,
          description:updatedData.description

       } 

    } 

    const result=await BoighorCollection.updateOne(updateDoc,query)
    res.send(result)
})



app.post('/user',async(req,res)=>{
    const user=req.body 
    const query={email:user.email}
    const existingUser=await userCollection.findOne(query)
     if(existingUser){
       res.send({message:"user already exist"}) 
     } 
     else{
       const result=await userCollection.insertOne(user) 
       res.send(result)
     } 
    
}) 

app.get('/user',async(req,res)=>{
     const user=await userCollection.find().toArray() 
     res.send(user)
}) 

app.patch('/user/:id',async(req,res)=>{
   const id=req.params.id 
   const {status}=req.body
   const result=await userCollection.updateOne({_id:new ObjectId(id)},
  {$set:{status:status}}
  ) 
  res.send(result)
    
})



app.post('/cart',async(req,res)=>{
    const item=req.body 
    const existingItem=await cartCollection.findOne({
        email:item.email,
        productId: item.productId
    }) 
 if(existingItem){
    res.send({message:"item already exists"})
 } 
 const result=await cartCollection.insertOne(item)
 res.send(result)

}) 

app.get('/cart',async(req,res)=>{
     const email=req.query.email 
     const result=await cartCollection.find({email}).toArray() 
     res.send(result)
}) 

// admin check api 
app.get(`/users/admin/:email`,async(req,res)=>{
     const email=req.params.email 
     const user=await userCollection.findOne({email:email})
      let isAdmin=false 
        if(user){
           isAdmin=user.role ==='admin'
        } 
        res.send({admin:isAdmin})
   
}) 





app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});