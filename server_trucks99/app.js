require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const session = require("express-session");
const passport = require("passport");
const MongoDBStore = require("connect-mongodb-session")(session);
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerBase = require("./docs/base");
const subscriptionRouter = require("./views/handleSubscriptionrouter");

// Swagger: generate OpenAPI spec from JSDoc (docs/base.js + docs/paths/*.js)
const swaggerOptions = {
  definition: swaggerBase,
  // Load path definitions from dedicated docs files and (optionally) inline JSDoc on route files.
  apis: [
    path.join(__dirname, "docs", "paths", "*.js"),
    path.join(__dirname, "views", "**", "*.js"),
  ],
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);

//express routers to handle routes
const loginRouter = require("./views/login");
const signupRouter = require("./views/signup");
const userRouter = require("./views/rbac/handleUser");
const googleRouter = require("./views/google");
const githubRouter = require("./views/github");
const logoutRouter = require("./views/logout");
const roleRouter = require("./views/rbac/handleRole");
const permissionRouter = require("./views/rbac/handlePermission");
const logRouter = require("./views/rbac/handleLog");
const otpRouter = require("./views/otp");
const authRouter = require("./views/authRouter");
const loadRouter = require("./views/handleLoad");
const bitRecordsRouter = require("./views/handleBitRecords");
const materialRouter = require("./views/handleMaterial");
const vehicleTypeRouter = require("./views/handleVehicleType");
const vehicleBodyTypeRouter = require("./views/handleVehicleBodyType");
const companyStartCountryRouter = require("./views/handleCompanyStartCountry");
const locationRouter = require("./views/handleLocation");

// Legacy party buy/sell CRUD (name/contact/type) — not used by TRUCK99 vehicle marketplace
// const legacyBuySellRouter = require("./views/handleBuySell");
// const shipperRouter = require('./views/handleShipper');
// const loaderRouter = require('./views/handleLoader');
// const agentRouter = require('./views/handleAgent');
const truckRouter = require("./views/handleTruck");
const dashboardRouter = require("./views/handleDashboard");
const notificationRouter = require("./views/handleNotification");
const incomeExpenseCategoryRouter = require("./views/handleIncomeExpenseCategory");
const incomeExpenseRouter = require("./views/handleIncomeExpense");
const uploadRouter = require("./views/upload");
const blockUnblockRouter = require("./views/handleBlockUnblock");
const firebaseSendMessageRouter = require("./views/firebassendmessage");
const {
  specificationRouter,
  specificationValueRouter,
} = require("./modules/specifications/routes/specificationRoutes");
const categoryRouter = require("./views/handleCategoryrouter");
const subCategoryRouter = require("./views/handleSubCategoryrouter");
const buySellProductRouter = require("./views/handlebuysellProduct");
const emiRouter = require("./views/handleEmiRouter");
const favoriteRouter = require("./views/handlefavoriteRoute");
const matchRouter = require("./views/handleMatchrouter");
const reportRouter = require("./views/handlereports");
const paymentRouter = require("./views/handlepaymentrouter");
const cmspagerouter  = require("./views/handlecmspagerouter");
const chatRouter = require("./views/handleChat");
const assistantRouter = require("./views/handleAssistant");
const advertisementRouter = require("./views/advertisementrouter");

// const reportRouter = require('./views/handleBuySellReport');
const app = express();

// Swagger UI at /api-docs (public, before auth middlewares)
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, { explorer: true }),
);

// CORS configuration
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:7501",
  "https://roxylius.github.io/AdminControl-RBAC",
  "https://admin-control-rbac.vercel.app",
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server / tools with no origin
    if (!origin) return callback(null, true);

    const isLocalhost =
      /^http:\/\/localhost:\d+$/.test(origin) ||
      /^http:\/\/127\.0\.0\.1:\d+$/.test(origin);

    // Allow your deployed frontend domain
    const isTruckElhaa = /^https?:\/\/truck\.elhaa\.com(?::\d+)?$/.test(origin);

    if (allowedOrigins.includes(origin) || isLocalhost || isTruckElhaa) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "DELETE", "PUT", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

// Enable CORS (including preflight) for API routes
app.use(cors(corsOptions)); // to enable cross origin resource sharing
app.options("*", cors(corsOptions));
app.use(bodyParser.urlencoded({ extended: true })); //to read the post request from html form
app.use(express.json()); //to interpret json

// Static files for uploaded assets (truck images, documents)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
var store = new MongoDBStore({ //setup to store the session in DB
  uri: process.env.MONGODB_ATLAS,
  collection: process.env.MONGODB_SESSION,
});

//event listner to catch the error
store.on("error", function (error) {
  // Also get an error here
  console.log("There is err storing session: ", error);
});

app.set("trust proxy", 1); //allows express.js behind a reverse proxy to trust proxy server
// On localhost (HTTP), secure: true would prevent the cookie from being set/sent; use secure only in production
const isProduction = process.env.NODE_ENV === "production";
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      sameSite: isProduction ? "none" : "lax", // lax allows cookie on same-site redirects in dev
      secure: isProduction, // false on localhost so cookie works over HTTP
      maxAge: 1000 * 60 * 60 * 24 * 180, //180 days
    },
    store: store,
  }),
);

app.use(passport.initialize());
app.use(passport.session());

const { jwtAuth } = require("./helpers/jwtAuth");
const { requireAuthUnlessPublic } = require("./helpers/requireAuth");

app.use(jwtAuth);
app.use(requireAuthUnlessPublic);

const User = require("./schema/user");
const { findByIdOrUuid } = require("./helpers/uuidHelper");

// used to serialize the user for the session (must use _id for findById compatibility)
passport.serializeUser(function (user, done) {
  done(null, user._id);
});

// used to deserialize the user (populate roleId + permissions for modules/buildModulesResponse)
// id can be ObjectId (from new sessions) or UUID (from old sessions before serializeUser fix)
passport.deserializeUser(async function (id, done) {
  try {
    const userDoc = await findByIdOrUuid(User, id);
    if (!userDoc) return done(null, null);
    const user = await User.findById(userDoc._id)
      .populate({ path: "roleId", populate: { path: "permissions" } })
      .populate("permissions")
      .exec();
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Routes
app.use("/api/login", loginRouter);
app.use("/api/signup", signupRouter);
app.use("/api/user", userRouter);
app.use("/api/auth/google", googleRouter);
app.use("/api/auth/github", githubRouter);
app.use("/api/logout", logoutRouter);
app.use("/api/role", roleRouter);
app.use("/api/permission", permissionRouter);
app.use("/api/log", logRouter);
app.use("/api/otp", otpRouter);
app.use("/api/auth", authRouter);
app.use("/api/bit-records", bitRecordsRouter);
app.use("/api/load", loadRouter);
app.use("/api/material", materialRouter);
app.use("/api/vehicle-type", vehicleTypeRouter);
app.use("/api/vehicle-body-type", vehicleBodyTypeRouter);
app.use("/api/company-start-country", companyStartCountryRouter);
app.use("/api/location", locationRouter);
app.use("/api/subscription", subscriptionRouter);
app.use("/api/payment", paymentRouter);
app.use("/api/cms", cmspagerouter);
app.use("/api/chat", chatRouter);
app.use("/api/assistant", assistantRouter);

app.use("/api/truck", truckRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/notification", notificationRouter);
app.use("/api/income-expense-category", incomeExpenseCategoryRouter);
app.use("/api/advertisement", advertisementRouter);
app.use("/api/ads", advertisementRouter); // legacy alias
app.use("/api/income-expense", incomeExpenseRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/block-unblock", blockUnblockRouter);

// Vehicle marketplace (Sell POST /add, list, dashboard-stats, cart, offers, Razorpay)
// Public browse routes: helpers/buySellPublicRoutes.js (via requireAuthUnlessPublic)
app.use("/api/buy-sell", buySellProductRouter);
app.use("/api/buysell", buySellProductRouter);
// EMI purchase flow — mount before broad /api handlers
app.use("/api/emi", emiRouter);

app.use("/api", firebaseSendMessageRouter);
app.use("/api/specifications", specificationRouter);
app.use("/api/specification-values", specificationValueRouter);
app.use("/api/category", categoryRouter);
app.use("/api/sub-category", subCategoryRouter);

app.use("/api/favorite", favoriteRouter);
app.use("/api/match", matchRouter);
app.use("/api/reports", reportRouter);
// app.use('/api', requireAuth)  // ← this blocks everything including otp/verify
// app.use('/api/reports', reportRouter);

//testing only
app.get("/", (req, res) => {
  res.send("server is up and running!");
});

// JSON 404 for unmatched API routes (avoid empty HTML 404 pages in the UI)
app.use((req, res, next) => {
  if (!req.originalUrl.startsWith("/api")) {
    return next();
  }
  res.status(404).json({
    message: "API route not found",
    method: req.method,
    path: req.originalUrl.split("?")[0],
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("[Server Error]", err?.stack || err);
  if (req.originalUrl?.startsWith("/api")) {
    return res
      .status(500)
      .json({
        message: "Internal Server Error",
        error: err?.message || String(err),
      });
  }
  res.status(500).send("Internal Server Error");
});

module.exports = app;
