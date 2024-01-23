const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const monk = require('monk');
const passport = require('passport');
const session = require('express-session');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
// const routes = require('./routes');
const app = express();

// Parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

// Parse application/json
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Setting view engine as ejs
app.set('view engine','ejs')
app.set('views', path.join(__dirname, '/public/view'))

//setting static files
app.use(express.static('public'))
app.use('/public',express.static(path.join(__dirname, 'public')));

// setting routes 
// app.use("/",routes)
// Connection to DB

var db = monk("127.0.0.1:27017/WPL-Project"); 
db.options = { 
    safe    : true,
    castIds : false
  };
var itemsCollection = db.get('Sportflix-items'); 
var usersCollection = db.get('Sportflix-users')
db.on('open', () => {
// Event listener for successful connection
console.log('Connected to MongoDB');
});

db.on('error', (err) => {
// Event listener for connection error
console.error('Error connecting to MongoDB:', err);
});

app.use(session({
    secret: "secret",
    resave: false,
    saveUninitialized: true, 
}));

app.use(passport.initialize())
app.use(passport.session())

passport.use(new LocalStrategy(async(username, password, done) =>{
    try{
    const user = await usersCollection.findOne({username: username});
    if(!user){ return done(null, false, {message: 'User not found'});}
    if(await bcrypt.compare(password, user.password)) {return done(null, user);}
    else { return done(null, false, {message: 'Incorrect Password'});}
    }
    catch(e){
        return done(e);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user)
});

passport.deserializeUser(async (username, done) => {
    try {
        const user = await usersCollection.findOne({ username: username.username });
        done(null, user);
    } catch (err) {
        done(err);
    }
});

checkAuth = (req, res, next) => {
    if(req.isAuthenticated()){ return next();}
    res.redirect("/login")
}

checkLoggedin = (req, res, next) => {
    if(req.isAuthenticated()){ return res.redirect("/home")}
    return next();
}

app.get("/",(req,res)=>{
    res.redirect("/login")
})

app.get("/home",checkAuth,async (req,res)=>{
    try {
        const filter = {}
        if (req.query.search) {
            filter['description'] = new RegExp(req.query.search, 'i');
            const channel = await itemsCollection.find(filter);
            res.render('filter', { res: channel });
        }
        else {
        const result = await itemsCollection.find({});
        const subscriptionsRes = []
        if (req.session.passport.user.subscriptions.length>0){
            for (let i = 0; i< req.session.passport.user.subscriptions.length;i++){
                let subscriptionsResults = await itemsCollection.findOne({name: req.session.passport.user.subscriptions[i]})
                subscriptionsRes.push(subscriptionsResults)
            }

            res.render("home",{res:result,userRes:subscriptionsRes,details:req.session.passport.user,newUser:false})
        }
        else{
            res.render("home",{res:result,details:req.session.passport.user,newUser:true})
        }
    }
    } catch (err) {
        console.error('Error retrieving data from MongoDB:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
})

app.get('/login', checkLoggedin, (req, res)=>{
    res.render('login');
});

app.get('/register', checkLoggedin, (req, res)=>{
    res.render('register');
});


app.get('/admin', checkAuth,async(req, res)=>{
    if(req.user.role === 'admin')
    {
        try{
            const users = await usersCollection.find({})
            const items = await itemsCollection.find({})
            res.render("admin",{details:users,res:items})
        }catch(err){
            res.status(500).json({status:"Internal Server Error"})
        }
        
    }
    else{
        res.redirect('/home');
    }
});


app.post('/addItems',checkAuth,async(req,res)=>{
  try{
    const item = await itemsCollection.insert({
        "name": req.body.item-name,
        "category":req.body.item-category,
        "description": req.body.item-escription,
        "price": {
          "monthly": req.body.item-monthly,
          "annual": req.body.item-annual
        },
        "links": {
          "thumbnail": req.body.item-thumbnail,
          "stream": req.body.item-stream},
        "alt_text": req.body.item-alttext
      })
      res.status(200).json({status: "Item added to database"})
  }catch(err){
    res.status(500).json({status:"Internal server Error"})
  }
    
})

app.get("/channel/:id",checkAuth,async(req,res)=>{
    const vid = await itemsCollection.findOne({_id:req.params.id})
    const related = await itemsCollection.find({ category: vid.category });
    for (let j =0;j<req.session.passport.user.subscriptions.length;j++){
        for (let i = 0; i<related.length;i++){
            if (req.session.passport.user.subscriptions[i] !== related[i].name){
                related.splice(i,1)
            }
        }
    }
    console.log(related)
    res.render("channel",{item:vid,related:related})
    });

app.get('/cart', checkAuth, async (req, res) => {
    const cartItems = [];
    try {
        console.log(req.session.passport.user.username)
        const user = await usersCollection.findOne({ username: req.session.passport.user.username });
        const cart = user.cart;

        for (const name of cart) {
            const item = await itemsCollection.findOne({ name: name });
            cartItems.push(item);
        }
        console.log(cartItems)
        res.render('cart', { listOfItems: cartItems });
    } catch (error) {
        console.error('Error fetching cart items:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/removeCart', async(req, res) => {
    try {
        const { selectedIds } = req.body;

        const username = req.user.username;

        const result = await usersCollection.update(
            { username: username },
            { $pull: { cart: { $in: selectedIds } } }
        );

        if (result.nModified > 0) {
            res.json({ message: 'Items removed successfully' });
        } else {
            res.json({ message: 'No items were removed' });
        }
    } catch (error) {
        console.error('Error removing items:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/checkout', async(req, res) =>{
    try{
        const u = await usersCollection.findOne({ username: req.user.username });
        const cart = u.cart;
        const result = await usersCollection.update(
            { username: req.user.username },
            { $push: { subscriptions: { $each: cart } },
              $set: { cart: []} }
        );
        if (result.nModified > 0) {
            // Send a success response
            res.json({ message: 'Checkout successful' });
        } else {
            // If no modifications were made, it means the cart was already empty
            res.json({ message: 'No items in the cart to checkout', flag: 0 });
        }
    } catch (error) {
        console.error('Error Checking Out:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/login', passport.authenticate('local', {
    successRedirect: "/admin",
    failureRedirect: "/login",
}));

app.get("/profile",checkAuth,(req,res)=>{
    // console.log(req.session.passport.user)
    res.render("profile",{user:req.session.passport.user})
})

app.post("/edit", async(req,res) => {
    
    const update = await usersCollection.update({username:req.session.passport.user.username},{$set : {
        
        username: req.body.username,
        email: req.body.email,
        phone: req.body.phone,
        address: req.body.address,
        dob:req.body.dob
      }});

      console.log("user updated",update)
})


app.post('/register', async(req, res)=>{
    try{
        const existingUser = await usersCollection.findOne({ username: req.body.username });
        if (existingUser) {
            req.flash('error', 'Username already exists. Please choose a different one.');
            res.redirect('/register');
        }
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const inserted = await usersCollection.insert({
          name:req.body.name,
          username: req.body.username,
          email: req.body.email,
          phone: req.body.phone,
          address: req.body.address,
          password: hashedPassword,
          dob:req.body.dob,
          subscriptions:[],
          cart:[],
          saved_payments:[],
          order_history:[]
        });
        console.log('User inserted:', inserted);
        res.redirect('/login');
    } catch{
        res.redirect('/register');
    }
})

app.post("/logout", checkAuth, (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error('Error during logout:', err);
            return res.redirect('/');
        }
        res.redirect('/login');
    });
});

app.post("/addToCart",checkAuth,async(req,res)=>{
    try{
        let flag = false
        for (let i =0;i<req.session.passport.user.cart.length;i++ ){
            console.log(req.session.passport.user.cart)
            if (req.body.name === req.session.passport.user.cart[i]){
                flag = true
            }
        }
        if (flag === false){
            const Res = await itemsCollection.findOne({name:req.body.name}) 
            await usersCollection.update(
            { username: req.session.passport.user.username }, // Filter to find the specific document by its ID
            { $push: { cart: Res.name } })
            res.status(200).json({status:"Added to Cart"})
        }
        else{
            res.status(400).json({status:"Item Already in cart"})
        }
    }catch(err){
        res.send(err)
    }
})
app.post('/delete/:id', async (req, res) => {
    const itemId = req.params.id;
  
    try {
      await usersCollection.findOneAndDelete({ _id: itemId });
      res.redirect('/admin');
    } catch (error) {
      res.status(500).send(error);
    }
  });
app.post('/itemDelete/:id',checkAuth,async(req,res)=>{
    try {
        await itemsCollection.findOneAndDelete({ name: req.params.id });
        res.redirect('/admin');
      } catch (error) {
        res.status(500).send(error);
      }
})

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Express server is running on port ${PORT}`);
});
