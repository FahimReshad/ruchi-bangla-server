const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(express.json());
app.use(cors());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rpkd5x3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const foodCollection = client.db("ruchiBangla").collection("foods");
    const purchaseCollection = client.db("ruchiBangla").collection("purchase");

    app.get("/food", async (req, res) => {
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

    app.get("/food/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foodCollection.findOne(query);
      res.send(result);
    });

    app.get("/food/:email", async (req, res) => {
      console.log(req.params.email);
      const cursor = foodCollection.find({ email: req.params.email });
      // let query = {};
      // if (req.query?.email) {
      //   query = { email: req.params.email };
      // }
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

    app.get('/topSellingFoods', async (req, res) => {
      const topSellingFoods = await foodCollection.find().sort({count: -1}).limit(6).toArray();
      res.send(topSellingFoods)
    })

    app.get("/purchaseFood", async (req, res) => {
      const cursor = purchaseCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });
    app.get("/purchaseFood/:email", async (req, res) => {
      console.log(req.params.email);
      const cursor = purchaseCollection.find({ email: req.params.email });
      // let query = {};
      // if (req.query?.email) {
      //   query = { email: req.params.email };
      // }
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post("/purchaseFood", async (req, res) => {
      const purchase = req.body;
      const result = await purchaseCollection.insertOne(purchase);
      await foodCollection.updateOne({ _id: new ObjectId() }, { $inc: { count: 1 } });
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

    app.delete("/purchaseFood/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await purchaseCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
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
