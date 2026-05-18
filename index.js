require('dotenv').config(); 
const express = require('express');
const cors = require('cors'); 
const admin = require('firebase-admin'); 


const decoded = Buffer.from(process.env.FIREBASE_SECRET_KEY, "base64").toString("utf8");
const serviceAccount = JSON.parse(decoded);   

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  }); 
}

const verifyToken = require('./middleware/verifyFirebaseToken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_KEY);

const app = express();
const port = process.env.PORT || 3000;

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

let isConnected = false;
let BoighorCollection, userCollection, cartCollection, orderCollection;


async function ensureConnection() {
  if (isConnected && BoighorCollection && userCollection && cartCollection && orderCollection) {
    return;
  }

  try {
    await client.connect();
    const BoighorDB = client.db('BoighorDB');
    BoighorCollection = BoighorDB.collection('BoighorCollection');
    userCollection = BoighorDB.collection('users');
    cartCollection = BoighorDB.collection('cart');
    orderCollection = BoighorDB.collection('orders');
    
    isConnected = true;
    console.log("MongoDB Connected Successfully");
  } catch (error) {
    console.error("MongoDB Connection Failed:", error);
    throw new Error("Database connection failed");
  }
}


const verifyAdmin = async (req, res, next) => { 
  try {
    await ensureConnection();
    if (!userCollection) {
      return res.status(500).send({ message: "Database not initialized" });
    }
    const email = req.decoded.email; 
    const user = await userCollection.findOne({ email: email }); 
    if (user?.role !== 'admin') {
      return res.status(403).send({ message: 'Forbidden Access' }); 
    } 
    next();
  } catch (error) {
    res.status(500).send({ message: "Admin verification error", error: error.message });
  }
};


app.get('/', (req, res) => {
  res.send('Server is running');
}); 

app.get('/books', async (req, res) => {
  try {
    await ensureConnection();
    const result = await BoighorCollection.find().toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

app.get('/books/:id', async (req, res) => { 
  try {
    await ensureConnection();
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await BoighorCollection.findOne(query);
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
}); 

app.post('/books', verifyToken, async (req, res) => { 
  try {
    await ensureConnection();
    const book = req.body; 
    if (req.decoded.email !== book.email) {
      return res.status(403).send({ message: "Forbidden Access" });
    }
    const result = await BoighorCollection.insertOne(book);
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

app.delete('/books/:id', async (req, res) => {
  try {
    await ensureConnection();
    const id = req.params.id; 
    const query = { _id: new ObjectId(id) }; 
    const result = await BoighorCollection.deleteOne(query);
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
}); 

app.patch('/books/:id', async (req, res) => {
  try {
    await ensureConnection();
    const id = req.params.id; 
    const updatedData = req.body; 
    const query = { _id: new ObjectId(id) }; 
    const updateDoc = {
      $set: {
        title: updatedData.title,
        author: updatedData.author,
        category: updatedData.category,
        price: updatedData.price,
        discountPrice: updatedData.discountPrice,
        stock: updatedData.stock,
        image: updatedData.image,
        shortDescription: updatedData.shortDescription,
        description: updatedData.description
      } 
    };  
    const result = await BoighorCollection.updateOne(query, updateDoc);
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

app.post('/user', verifyToken, async (req, res) => {
  try {
    await ensureConnection();
    const user = req.body; 
    if (req.decoded.email !== user.email) {
      return res.status(403).send({ message: "Forbidden Access" });
    }
    const query = { email: user.email };
    const existingUser = await userCollection.findOne(query);
    if (existingUser) {
      res.send({ message: "user already exist" }); 
    } else {
      const result = await userCollection.insertOne(user); 
      res.send(result);
    } 
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
}); 

app.get('/user', verifyToken, async (req, res) => { 
  try {
    await ensureConnection();
    const user = await userCollection.find().toArray(); 
    res.send(user);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
}); 

app.get('/user-stats', verifyToken, async (req, res) => {
  try {
    await ensureConnection();
    const email = req.query.email; 
    if (email !== req.decoded.email) {
      return res.status(403).send({ message: "Forbidden Access" });
    }
    if (!email) return res.status(400).send({ message: "Email is required" }); 
    
    const totalOrders = await orderCollection.countDocuments({ email }); 
    const spendResult = await orderCollection.aggregate([
      { $match: { email: email, paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: "$totalPrice" } } }
    ]).toArray(); 
    const totalSpent = spendResult.length > 0 ? spendResult[0].total : 0; 
    res.send({ totalOrders, totalSpent });
  } catch (error) {
    res.status(500).send({ message: "Failed", error: error.message });
  }
});

app.patch('/user/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    await ensureConnection();
    const id = req.params.id; 
    const { status } = req.body;
    const result = await userCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: status } }
    ); 
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

app.post('/cart', async (req, res) => {
  try {
    await ensureConnection();
    const item = req.body; 
    const existingItem = await cartCollection.findOne({
      email: item.email,
      productId: item.productId
    }); 
    if (existingItem) {
      return res.send({ message: "item already exists" });
    } 
    const result = await cartCollection.insertOne(item);
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
}); 

app.get('/cart', verifyToken, async (req, res) => {
  try {
    const email = req.query.email; 
    if (email !== req.decoded.email) {
      return res.status(403).send({ message: "Forbidden Access" });
    }
    await ensureConnection();
    const result = await cartCollection.find({ email }).toArray(); 
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
}); 

app.delete('/cart/:id', async (req, res) => {
  try {
    await ensureConnection();
    const id = req.params.id; 
    const query = { _id: new ObjectId(id) };
    const result = await cartCollection.deleteOne(query);
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
}); 

app.post('/orders', async (req, res) => {
  try {
    await ensureConnection();
    const order = req.body; 
    const result = await orderCollection.insertOne(order);
    const query = { email: order.email };
    await cartCollection.deleteMany(query);
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});  

app.get('/orders', async (req, res) => {
  try {
    await ensureConnection();
    const email = req.query.email; 
    if (!email) {
      return res.status(400).send({ message: "Email is required" });
    }
    const result = await orderCollection.find({email}).toArray();
    res.send(result); 
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
}); 


app.post('/create-checkout-session', async (req, res) => {
  try {
    await ensureConnection();
    const payment = req.body; 
    const amount = payment.totalPrice * 100; 
    const productName = payment.cartItems?.map(item => item.title).join(', ') || 'Order';
    
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: "bdt",
            unit_amount: amount,
            product_data: {
              name: productName
            }
          },
          quantity: 1,
        },
      ], 
      metadata: {
        customerName: payment.customerName,
        phone: payment.phone,
        address: payment.address,
        email: payment.email,
        cartIds: JSON.stringify(payment.cartItems.map(item => item._id))
      },
      mode: 'payment',
      success_url: `${process.env.SITE_URL}/dashboard/Success?session_id={CHECKOUT_SESSION_ID}`,
    });  
    res.send({ url: session.url });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
}); 

app.get('/verify-payment', async (req, res) => {
  try {
    await ensureConnection();
    const { session_id } = req.query;
    const session = await stripe.checkout.sessions.retrieve(session_id); 
    
    if (session.payment_status === 'paid') { 
      const existingOrder = await orderCollection.findOne({ 
        transactionId: session.payment_intent 
      }); 
      if (existingOrder) {
        return res.send({ success: true, message: "Order already saved" });
      }

      const orderData = {
        customerName: session.metadata.customerName,
        email: session.metadata.email,
        phone: session.metadata.phone,
        address: session.metadata.address,
        totalPrice: session.amount_total / 100,
        paymentMethod: 'online',
        paymentStatus: 'paid',
        transactionId: session.payment_intent,
        createdAt: new Date(),
        cartItems: JSON.parse(session.metadata.cartIds || "[]")
      };

      const result = await orderCollection.insertOne(orderData);
      await cartCollection.deleteMany({ email: session.metadata.email });
      res.send({ success: true, result });
    } else {
      res.send({ success: false, message: "Payment not verified" });
    }
  } catch (error) {
    console.error("Verification Error:", error);
    res.status(500).send({ success: false, error: error.message });
  }
});

app.post('/cash-on-delivery', async (req, res) => {
  try {
    await ensureConnection();
    const order = req.body;
    const result = await orderCollection.insertOne({
      ...order,
      paymentMethod: "cod",
      paymentStatus: "pending",
      createdAt: new Date()
    });
    await cartCollection.deleteMany({ email: order.email });
    res.send({ success: true, insertedId: result.insertedId });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
}); 

app.post('/save-order', async (req, res) => {
  try {
    await ensureConnection();
    const orderData = req.body; 
    const result = await orderCollection.insertOne({
      ...orderData,
      paymentMethod: 'online',
      paymentStatus: 'paid', 
      createdAt: new Date() 
    }); 
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

app.get(`/users/admin/:email`, verifyToken, async (req, res) => { 
  try {
    await ensureConnection();
    if (!userCollection) {
      return res.status(500).send({ message: "Database not initialized" });
    }
    const email = req.params.email; 
    if (email !== req.decoded.email) {
      return res.status(403).send({ message: 'Forbidden access' });
    }
    const user = await userCollection.findOne({ email: email });
    let isAdmin = false; 
    if (user) {
      isAdmin = user.role === 'admin';
    } 
    res.send({ admin: isAdmin });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
}); 


if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

module.exports = app;