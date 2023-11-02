const express = require('express')
require('dotenv').config()
var cors = require('cors')
var cookieParser = require('cookie-parser')
var jwt = require('jsonwebtoken');

const app = express()

app.use(cookieParser())
app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true
}))
app.use(express.json())

const port = process.env.PORT || 3000

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const uri = `mongodb+srv://${process.env.USER}:${process.env.PASS}@cluster0.vdfwpbk.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// meddle wear
const verify = async (req, res, next) => {
    const token = req.cookies?.token
    if (!token) {
        return res.status(401).send({ message: "unAuthorize access" })
    }
    jwt.verify(token, process.env.SECRET, function (err, decoded) {
        if (err) {
            return res.status(401).send({ message: "unAuthorize access" })
        }
        req.user = decoded;
        next()
    });

}

// start

app.post('/jwt', (req, res) => {
    try {
        const token = jwt.sign(req.body, process.env.SECRET, { expiresIn: '1h' });
        res
            .cookie('token', token, {
                httpOnly: true,
                secure: false,
                sameSite: false,
            })
            .send(token)

    } catch (error) {
        console.log(error)
    }
})


app.get('/cookedelet', (req, res) => {
    res.clearCookie('token', { maxAge: 0 }).send({ sucess: true })
})




async function run() {
    try {
        const database = client.db("carDocter");
        const checkout = database.collection("checkout");
        const services = database.collection("services");
        const product = database.collection("product");


        // get services
        app.get('/services', async (req, res) => {
            const result = await services.find().toArray()
            res.send(result)
        })
        // single item
        app.get('/service', verify, async (req, res) => {
            const id = req.query.id
            const email = req.query.email
            const token = req.user
            if (token.email !== email) {
                return res.status(403).send({ message: "Not access" })
            }
            const result = await services.findOne({ _id: new ObjectId(id) })
            res.send(result)
        })


        // save product
        app.post('/check', verify, async (req, res) => {
            const email = req.body.email
            const token = req.user
            if (token.email !== email) {
                return res.status(403).send({ message: "Not access" })
            }
            const result = await checkout.insertOne(req.body)
            res.send(result)
        })

        // how to get data

        app.get('/checkoutData', verify, async (req, res) => {
            const email = req.query.email
            const token = req.user
            if (token.email !== email) {
                return res.status(403).send({ message: "Not access" })
            }
            const result = await checkout.find({ email: email }).toArray()
            res.send(result)
        })

        // single
        app.get('/allcheckout', verify, async (req, res) => {
            const result = await checkout.find().toArray()
            res.send(result)
        })







        app.get('/product', async (req, res) => {
            const page = parseInt(req.query.page);
            const limit = parseInt(req.query.size);
            const result = await product.find().skip(page * limit).limit(limit).toArray()
            res.send(result)
        })

        app.get('/products', async (req, res) => {
            const totalCount = await product.countDocuments({})
            res.send({totalCount})
        })















        app.patch('/allcheckout/:id', verify, async (req, res) => {
            const filter = { _id: new ObjectId(req.params.id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    status: req.body
                },
            };
            const result = await checkout.updateOne(filter, updateDoc, options);
            res.send(result)
        })

        // delete
        app.delete('/allcheckout/:id', verify, async (req, res) => {
            const result = await checkout.deleteOne({ _id: new ObjectId(req.params.id) })
            res.send(result)
        })





        await client.connect();
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})