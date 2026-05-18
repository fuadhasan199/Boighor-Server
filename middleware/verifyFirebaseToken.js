const admin = require("firebase-admin"); 

const verifyToken = async(req,res,next)=>{
      const authHeader=req.headers.authorization 
      if(!authHeader || !authHeader.startsWith("Bearer ")){
           return res.status(401).send({ message: 'Unauthorized Access' });
      }
      const token=authHeader.split(" ")[1] 

      try{ 
          if (admin.apps.length === 0) {
       return res.status(500).send({ message: "Firebase Admin not initialized" });
    }
           const decodedToken=await admin.auth().verifyIdToken(token) 
           req.decoded=decodedToken 
           next()
      } 
      catch(error){
         res.status(401).send({messsage:"Unauthozied Access",error:error.message})
      }
} 
module.exports=verifyToken