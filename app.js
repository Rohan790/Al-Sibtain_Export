//jshint esversion:6
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const _ = require("lodash");
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');

const mongoose = require('mongoose');
const session = require('express-session');
// const cookieParser = require("cookie-parser");
// const connectFlash = require("connect-flash");
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');

const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '/public/')));
// app.use(cookieParser("process.env.SECRET"));
app.use(session({
    secret: 'process.env.SECRET',
    resave: false,
    saveUninitialized: false
    // cookie: {
    //     maxAge: 4000000
    // }
}));
// app.use(connectFlash());

app.use(passport.initialize());
app.use(passport.session());
app.use(function (req, res, next) {
    res.locals.isAuthenticated = req.isAuthenticated();
    next();
});

// app.use((req, res, next) => {
//     res.locals.flashMessages = req.flash();
//     next();
// });


mongoose.connect("mongodb+srv://db1-alsibtain:db1alsibtain@alsibtain.xvx64.mongodb.net/myFirstDatabase?retryWrites=true&w=majority", {
    useNewUrlParser: true,
    useUnifiedTopology: true
});
mongoose.set("useCreateIndex", true);



const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
    console.log("we're connected!");
});

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, new Date().getDate() + '-' + file.originalname);
    }
});

const fileFilter = function (req, file, cb) {
    if (['image/jpeg', 'image/png', 'image/jpg'].includes(file.mimetype)) {
        cb(null, true);
    } else {
        console.log("not supported!");
        cb(null, false);
    }
}

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 12
    },
    fileFilter: fileFilter
});

const productSchema = {
    productName: String,
    productLogo: String,
    productImages: [String]
};

const categorySchema = {
    categoryName: String,
    categoryLogo: String,
    subCategory: [productSchema]
};

const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

userSchema.plugin(passportLocalMongoose);

const Product = mongoose.model("Product", productSchema);
const Category = mongoose.model("Category", categorySchema);
const User = new mongoose.model('User', userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (user, done) {
    done(null, user);
});

app.post("/enquiryMail", function (req, res) {
    var transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
            user: process.env.EMAIL,
            pass: process.env.EPASS
        }
    });

    var textBody = `FROM: ${req.body.userName} EMAIL: ${req.body.userEmail} PHONE: ${req.body.userPhone} MESSAGE: ${req.body.userMessage}`;
    var htmlBody = `<h2>Mail From Contact Form - <p> Someone has queried for information.</p> </h2><h4>From: ${req.body.userName}</h4> <h4>Email: <a href="mailto:${req.body.userEmail}">${req.body.userEmail}</a></h4> <h4>Phone: ${req.body.userPhone}</h4> <h4>Message: ${req.body.userMessage}</h4>`;
    var mail = {
        from: process.env.EMAIL,
        to: process.env.EMAIL,
        subject: "Mail From Contact Form", // Subject line
        text: textBody,
        html: htmlBody
    };

    // send mail with defined transport object
    transporter.sendMail(mail, function (err, info) {
        if (err) {
            console.log(err);
            res.redirect('/contact');
        } else {
            res.redirect('/contact');
        }
    });
});

app.post("/register", function (req, res) {

    User.register({
        username: req.body.username
    }, req.body.password, (err, result) => {
        if (err) {
            console.log(err);
            // showw User available --->
            res.redirect('/login');
        } else {
            passport.authenticate("local")(req, res, function () {
                // showw User created --->
                res.redirect('/compose');
            });
        }
    });
});

app.post("/login", function (req, res) {
    const user = new User({
        email: req.body.username,
        password: req.body.password
    });

    req.login(user, function (err) {
        if (err) {
            // showw Password not matched --->
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect('/compose');
            });
        }
    });
});


app.get("/", (req, res) => {
    res.render("home");
});

app.get("/:routeName", (req, res) => {
    const routeName = _.lowerCase(req.params.routeName);
    if (routeName === 'login') {
        if (req.isAuthenticated()) {
            res.redirect('/');
        } else {
            res.render('login');
        }
    } else if (routeName === 'about') {
        res.render("about");
    } else if (routeName === 'contact') {
        res.render("contact");
    } else if (routeName === 'compose') {
        if (req.isAuthenticated()) {
            Category.find({}, function (err, foundCategory) {
                if (foundCategory.length === 0) {
                    // console.log("No Products are available!");
                    res.render("compose", {
                        categorylist: []
                    });
                } else {
                    res.render("compose", {
                        categorylist: foundCategory
                    });
                }
            });
        } else {
            res.redirect("/login");
        }
    } else if (routeName === 'products') {
        Category.find({}, function (err, foundProducts) {
            if (foundProducts.length === 0) {
                // console.log("No Products are available!");
                res.render("products", {
                    categorylist: []
                });
            } else {
                res.render("products", {
                    categorylist: foundProducts
                });
            }
        });
    } else if (routeName === 'logout') {
        req.logout();
        req.session.destroy();
        res.redirect('/');
    } else {
        res.render("error");
    }
});

app.get("/products/:itemName", (req, res) => {
    const urlText = _.lowerCase(req.params.itemName);
    let itemTitle = '';
    let checker = true;

    Category.find({}, function (err, foundProducts) {
        foundProducts.forEach((product) => {
            itemTitle = _.lowerCase(product.categoryName);
            if (urlText === itemTitle) {
                checker = false;
                res.render("sub_Category", {
                    subCate: product
                });
            }
        });

        if (checker) {
            res.render('error');
        }
    });
});

app.get("/products/:catName/:subCatName", (req, res) => {
    const categoryName = req.params.catName;
    const sub_CateName = req.params.subCatName;

    let itemTitle = '';
    let checker = true;

    Category.findOne({categoryName: categoryName}, (err, foundCategory) => {

               let all=[];
               if(foundCategory.subCategory){
               for(let i=0; i<  foundCategory.subCategory.length; i++){
                   
                    if (foundCategory.subCategory[i].productName == sub_CateName) {
                        all.push(foundCategory.subCategory[i]);
                    } 
                   
                
               }
            }
               res.render("product", {categoryItems: all});

            }
    );
});


let port = process.env.PORT;

if(port == null || port == ""){
    port = 3000;
}

app.listen(port, () => console.log("Server has started successfully."));


app.post('/createCategory',
    upload.fields([{
        name: 'itemAvatar',
        maxCount: 1
    }]),

    function (req, res, next) {
        const category_title = req.body.createCategory;
        const category_avatar = req.files['itemAvatar'][0].filename;

        const categoryDescription = new Category({
            categoryName: category_title,
            categoryLogo: category_avatar
        });

        Category.findOne({
            categoryName: category_title
        }, (err, category) => {
            if (err => {
                    return
                });
            if (category) {
                // showw Category available already --->
                console.log("category already available!");
            } else {
                categoryDescription.save();
            }

            res.redirect("/compose");

        });
    }
);

app.post('/createSubCategory',
    upload.fields([{
        name: 'subCateLogo',
        maxCount: 1
    }, {
        name: 'subCateGallery',
        maxCount: 12
    }]),

    function (req, res, next) {
        const category_Name = req.body.categoryName;
        const sub_CategoryName = req.body.subCateName;
        const sub_CategoryLogo = req.files['subCateLogo'][0].filename;;
        const item = req.files['subCateGallery'];

        let sub_CategoryImages = [];
        item.forEach((image) => {
            sub_CategoryImages.push(image.filename);
        });


        const productDescription = new Product({
            productName: sub_CategoryName,
            productLogo: sub_CategoryLogo,
            productImages: sub_CategoryImages
        });

        Category.findOne({
            categoryName: category_Name
        }, (err, category) => {
            if (err => {
                    return
                }); 
            let subCate = [];
            subCate = category.subCategory;
            let found=false;
            subCate.forEach(sc =>{
               if(sc.productName==sub_CategoryName){
                   found=true;
               }
            })
            if(found){
                res.redirect("/compose");
            }
            else{
                subCate.push(productDescription);
                category.subCategory = subCate;
                category.save();
                res.redirect("/products");
            }
        });
    }
);

app.post('/updateCategory',
    upload.fields([{
        name: 'updateItemAvatar',
        maxCount: 1
    }]),

    function (req, res, next) {
        const title = req.body.updateCategoryName;
        let category_title;
        let category_avatar;
 

        if (req.body.updateItemTitle) {
            category_title = req.body.updateItemTitle;
        }
        if (req.files['updateItemAvatar']) {
            category_avatar = req.files['updateItemAvatar'][0].filename;
        }

        Category.findOne({categoryName: title}, (err, product) => {
            if (err => {return});

            if (product) {
                if (category_title) {
                    product.categoryName = category_title;
                    product.save();
                }

                if (category_avatar) {
                    product.categoryLogo = category_avatar;
                    product.save();
                }
            } else {
                // show Category not available --->
                console.log("product not available");
            }

            res.redirect("/compose");

        });
    }
);

app.post('/updateSubCategory',
    upload.fields([{
        name: 'updateSubCateAvatar',
        maxCount: 1
    }, {
        name: 'updateSubCateGallery',
        maxCount: 12
    }]),

    function (req, res, next) {
        let arr=req.body.subCategoryName.split('/');
        const category = arr[0];
        const sub_Category = arr[1];

        const item = req.files['updateSubCateGallery'];
        let sub_category_title;
        let sub_category_avatar;
        let sub_category_gallery = [];

        if (req.body.updateSubCateTitle) {
            sub_category_title = req.body.updateSubCateTitle;
        }
        if (req.files['updateSubCateAvatar']) {
            sub_category_avatar = req.files['updateSubCateAvatar'][0].filename;
        }
        if (item) {
            item.forEach((image) => {
                sub_category_gallery.push(image.filename);
            });
        }

        Category.findOne({categoryName: category}, (err, product) => {
            if (err => {return})

            if (product) {
                let subCate = [];
                subCate = product.subCategory;
                subCate.forEach(sc => { 
                    if (sc.productName == sub_Category) {
                        if (sub_category_title) {
                            sc.productName = sub_category_title;
                        }

                        if (sub_category_avatar) {
                            sc.productLogo = sub_category_avatar;
                        }

                        if (sub_category_gallery.length > 0) {
                            let productImages = [];
                            productImages = sc.productImages;
                            sub_category_gallery.forEach(image => {
                                productImages.push(image);
                            });
                            sc.productImages = productImages;
                        }
                        product.save();
                        res.redirect("/products");
                    } else {
                        console.log("Sub-Category Not Found!");
                        res.redirect("/compose");
                    }
                });
            }
        });
    }
);

app.post('/deleteCategory', (req, res) => {
    const categoryTitle = req.body.deleteCategoryName;

    Category.findOneAndDelete({
        categoryName: categoryTitle
    }, (err, res) => {
        if (err => {
                console.log(err);
                // showw Category not deleted --->
                res.redirect("/compose");
            });
    });

    // showw Category deleted --->
    res.redirect("/products");
});

app.post('/deleteSubCategory', (req, res) => {
    let arr=req.body.deleteSubCategoryName.split('/');
    const category = arr[0];
    const sub_Category = arr[1];

    const categoryTitle = req.body.deleteSubCategoryName;
   
    Category.findOne({categoryName: category}, (err, category) => {
        let all=[];
        if(category.subCategory){
            category.subCategory.forEach( subCategory => {
                if (subCategory.productName != sub_Category) {
                    all.push(subCategory);
                }
            });

            category.subCategory = all;
            category.save();
        }
        res.redirect("/products");

    })
});

app.post("/viewCategory", (req, res) => {
    let arr=req.body.viewCategoryName.split('/');
    res.redirect("/view_product/" + arr[0] + '/' + arr[1]);
});

app.get("/view_product/:catName/:subCatName", (req, res) => {
    const categoryName = req.params.catName;
    const sub_CateName = req.params.subCatName;

    let itemTitle = '';
    let checker = true;

    Category.findOne({categoryName: categoryName}, (err, foundCategory) => {

               let all=[];
               if(foundCategory.subCategory){
               for(let i=0; i<  foundCategory.subCategory.length; i++){
                   
                    if (foundCategory.subCategory[i].productName == sub_CateName) {
                        all.push(foundCategory.subCategory[i]);
                    } 
                   
                
               }
            }
               res.render("view_product", {categoryItems: all, foundCategory: foundCategory});

            }
    );
});

app.post("/view_product/:catname/:subcatname/:itemImage", (req, res) => {
    const urlText = req.params.catname;
    const sub_CateName = req.params.subcatname;
    const selectedImage = req.params.itemImage;


    Category.findOne({categoryName: urlText}, (err, category) => {
        let all=[];
        if(category.subCategory){
            for(let i=0; i<  category.subCategory.length; i++){
                if (category.subCategory[i].productName == sub_CateName) {
                    category.subCategory[i].productImages.forEach(image => {
                        if(image != selectedImage){
                            all.push(image);
                        }
                    });  
                    category.subCategory[i].productImages=all;

                }                
            }
            category.save();
        }
        res.redirect("/view_product/" + urlText + '/' + sub_CateName);

    })
});