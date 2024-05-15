const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://ruchi-bangla.web.app",
      "https://ruchi-bangla.firebaseapp.com",
    ],
    credentials: true,
  })
);
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rpkd5x3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// middlewares
const logger = async (req, res, next) => {
  console.log("called", req.host, req.originalUrl);
  next();
};

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  console.log("value of token in middleware", token);
  if (!token) {
    return res.status(401).send({ message: "Unauthorized access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    // error
    if (err) {
      console.log(err);
      return res.status(401).send({ message: "Unauthorized access" });
    }

    // if token is valid it would be decoded
    console.log("value in the token", decoded);
    req.user = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const foodCollection = client.db("ruchiBangla").collection("foods");
    const purchaseCollection = client.db("ruchiBangla").collection("purchase");
    const galleryCollection = client.db("ruchiBangla").collection("gallery");

    // auth related api:

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" ? true : false,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    };

    //creating Token
    app.post("/jwt", logger, async (req, res) => {
      const user = req.body;
      console.log("user for token", user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });

      res.cookie("token", token, cookieOptions).send({ success: true });
    });

    //clearing token:
    app.post("/logout", async (req, res) => {
      const user = req.body;
      console.log("logging out", user);
      res
        .clearCookie("token", { ...cookieOptions, maxAge: 0 })
        .send({ success: true });
    });

    app.get("/food", logger, async (req, res) => {
      const cursor = foodCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post("/food", async (req, res) => {
      const add = req.body;
      add.count = 0;
      const result = await foodCollection.insertOne(add);
      res.send(result);
    });

    app.get("/food/id/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foodCollection.findOne(query);
      res.send(result);
    });

    app.put("/food/id/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedFood = req.body;
      const food = {
        $set: {
          image: updatedFood.image,
          name: updatedFood.name,
          category: updatedFood.category,
          description: updatedFood.description,
          price: updatedFood.price,
          quantity: updatedFood.quantity,
          made_by: updatedFood.made_by,
          origin: updatedFood.origin,
        },
      };
      const result = await foodCollection.updateOne(filter, food, options);
      res.send(result);
    });

    app.get("/food/email/:email", async (req, res) => {
      console.log(req.params.email);

      // let query = {};
      // if (req.query?.email) {
      //   query = { email: req.params.email };
      // }
      // const cursor = foodCollection.find(query);
      const cursor = foodCollection.find({ email: req.params.email });
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/food/search/:name", async (req, res) => {
      const name = req.params.name;
      try {
        const result = await foodCollection
          .find({ name: { $regex: name, $options: "i" } })
          .toArray();
        res.json(result);
      } catch (error) {
        console.error("Error searching for food:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    app.get("/topSellingFoods", async (req, res) => {
      const topSellingFoods = await foodCollection
        .find()
        .sort({ count: -1 })
        .limit(6)
        .toArray();
      res.send(topSellingFoods);
    });

    app.get("/purchaseFood", async (req, res) => {
      console.log(req.query.email);
      const cursor = purchaseCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/purchaseFood/:email", logger, verifyToken, async (req, res) => {
      console.log(req.params.email);
      console.log("token owner info", req.user);
      if (req.params.email !== req.user.email) {
        return res.status(403).send({ message: "forbidden access" });
      }

      let query = {};
      if (req.params?.email) {
        query = { email: req.params.email };
      }
      const cursor = purchaseCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post("/purchaseFood", async (req, res) => {
      const purchase = req.body;
      const result = await purchaseCollection.insertOne(purchase);
      await foodCollection.updateOne(
        { _id: new ObjectId() },
        { $inc: { count: 1 } }
      );
      res.send(result);
    });

    // app.post("/purchaseFood", async (req, res) => {
    //   const { foodIds } = req.body;
    //   const foodIdsWithObjectId = foodIds.map((id) => new ObjectId(id));

    //   try {
    //     // Increment the count property in the food document for each purchased item
    //     await foodCollection.updateMany(
    //       { _id: { $in: foodIdsWithObjectId } },
    //       { $inc: { count: 1 } }
    //     );

    //     // Return the updated food items
    //     const updatedFoods = await foodCollection
    //       .find({ _id: { $inc: foodIdsWithObjectId } })
    //       .toArray();
    //     res.send(updatedFoods);
    //   } catch (error) {
    //     console.error("Error purchasing food:", error);
    //     res.status(500).json({ error: "Internal server error" });
    //   }
    // });

    app.get("/productsCount", async (req, res) => {
      try {
        const count = await purchaseCollection.countDocuments();
        res.send({ count });
      } catch (error) {
        console.error("Error counting products:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    app.get("/gallery", async (req, res) => {
      const result = await galleryCollection.find().toArray();
      res.send(result);
    });

    app.post("/gallery", async (req, res) => {
      const gallery = req.body;
      const result = await galleryCollection.insertOne(gallery);
      res.send(result);
    });

    app.delete("/purchaseFood/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await purchaseCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", async (req, res) => {
  res.send("Ruchi Bangla is running");
});

app.listen(port, () => {
  console.log(`ruchi bangla server running on the port: ${port}`);
});
