require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const compression = require("compression");
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
const favoriteRouter = require("./views/handlefavoriteRoute");
const matchRouter = require("./views/handleMatchrouter");
const reportRouter = require("./views/handlereports");
const paymentRouter = require("./views/handlepaymentrouter");
const cmspagerouter  = require("./views/handlecmspagerouter");
const chatRouter = require("./views/handleChat");
const assistantRouter = require("./views/handleAssistant");
const advertisementRouter = require("./views/advertisementrouter");
const emiRouter = require("./views/handleEmiRouter");
const contactRouter = require("./views/handleContactRouter");
const legalRouter = require("./views/handleLegalRouter");

// const reportRouter = require('./views/handleBuySellReport');
const app = express();

// ─── CORS (must run before any other middleware / routes) ───────────────────
function normalizeOrigin(value) {
  if (!value || typeof value !== "string") return null;
  try {
    return new URL(value.trim()).origin;
  } catch {
    return value.trim().replace(/\/$/, "") || null;
  }
}

const defaultOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:3003",
  "http://localhost:7501",
  "http://localhost:3004",
  "http://localhost:3005",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "http://127.0.0.1:3002",
  "http://127.0.0.1:3003",
  // Production frontend (port matters — browser Origin includes :3002)
  "http://truck.elhaa.com:3002",
  "https://truck.elhaa.com:3002",
  "http://truck.elhaa.com",
  "https://truck.elhaa.com",
  "http://truck.elhaa.com:3000",
  "https://trucks99.com",
  "https://www.trucks99.com",
  "http://trucks99.com",
  "http://www.trucks99.com",
];

const envOrigins = [
  ...(process.env.CORS_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
]
  .map(normalizeOrigin)
  .filter(Boolean);

const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins])];
const allowAllCors =
  String(process.env.CORS_ALLOW_ALL || "").toLowerCase() === "true";

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (allowAllCors) return true;
  if (allowedOrigins.includes(origin)) return true;

  if (
    /^https?:\/\/localhost(?::\d+)?$/i.test(origin) ||
    /^https?:\/\/127\.0\.0\.1(?::\d+)?$/i.test(origin)
  ) {
    return true;
  }

  // Any subdomain of elhaa.com on any port (http://truck.elhaa.com:3002)
  if (/^https?:\/\/([a-z0-9-]+\.)*elhaa\.com(?::\d+)?$/i.test(origin)) {
    return true;
  }

  // Client production UI
  if (/^https?:\/\/(www\.)?trucks99\.com(?::\d+)?$/i.test(origin)) {
    return true;
  }

  // Same hostname as CLIENT_URL (any port)
  const clientOrigin = normalizeOrigin(process.env.CLIENT_URL);
  if (clientOrigin) {
    try {
      if (new URL(origin).hostname === new URL(clientOrigin).hostname) {
        return true;
      }
    } catch {
      /* ignore */
    }
  }

  return false;
}

console.log(
  "[CORS] allowed origins:",
  allowedOrigins.join(", "),
  allowAllCors ? "(CORS_ALLOW_ALL=true)" : "",
);

// Manual CORS headers first — reliable behind nginx / when cors package alone is insufficient
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && isAllowedOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With, Accept, Origin",
    );
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
    res.setHeader("Vary", "Origin");
  } else if (origin) {
    console.warn("[CORS] blocked origin:", origin);
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  return next();
});

const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) return callback(null, true);
    console.warn("[CORS] blocked origin:", origin);
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "DELETE", "PUT", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
  exposedHeaders: ["Content-Disposition"],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

const { restoreStrippedApiPrefix } = require("./helpers/restoreStrippedApiPrefix");
app.use(restoreStrippedApiPrefix);

// gzip/brotli when client Accept-Encoding allows — shrinks large list JSON payloads
app.use(
  compression({
    threshold: 1024,
    level: 6,
  }),
);

// Swagger UI at /api-docs (public, before auth middlewares)
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, { explorer: true }),
);
app.use(bodyParser.urlencoded({ extended: true })); //to read the post request from html form
app.use(express.json()); //to interpret json

// Static files for uploaded assets (truck images, documents)
const uploadsDir = path.join(__dirname, "uploads");
app.use("/uploads", express.static(uploadsDir));
app.use("/api/uploads", express.static(uploadsDir));
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
// On HTTP (no TLS), secure cookies are never sent — detect from CALLBACK/CLIENT URL
const isProduction = process.env.NODE_ENV === "production";
const usesHttps = [process.env.CLIENT_URL, process.env.CALLBACK_URL_ORIGIN]
  .some((u) => typeof u === "string" && u.trim().toLowerCase().startsWith("https://"));
const cookieSecure = isProduction && usesHttps;
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      sameSite: cookieSecure ? "none" : "lax",
      secure: cookieSecure,
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
// Support both /api/... and production aliases used by nginx/proxy or legacy clients.
app.use("/buy-sell", buySellProductRouter);
app.use("/buysell", buySellProductRouter);
app.use("/api/buy-sell", buySellProductRouter);
app.use("/api/buysell", buySellProductRouter);
// EMI calculator — public estimate endpoints
app.use("/api/emi", emiRouter);
// Contact us — public info + form submit
app.use("/api/contact", contactRouter);
// Terms & Privacy — public read, admin update
app.use("/api/legal", legalRouter);

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

  const isJsonParseError =
    err instanceof SyntaxError &&
    (err.status === 400 || err.type === "entity.parse.failed");

  if (isJsonParseError && req.originalUrl?.startsWith("/api")) {
    return res.status(400).json({
      message:
        "Invalid JSON in request body. Remove trailing commas and send a valid JSON object.",
      error: err?.message || String(err),
    });
  }

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
