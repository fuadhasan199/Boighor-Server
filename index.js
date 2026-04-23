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

async function run() {
  try {
    await client.connect();
    const BoighorDB = client.db('BoighorDB');
    BoighorCollection = BoighorDB.collection('BoighorCollection');
    
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



app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});