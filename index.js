const express = require('express');
require('dotenv').config({ quiet: true });
const bodyParser = require('body-parser');
const cors = require('cors');
const mainRouter = require('./Routes/Routes.js');
const connectDB = require('./Configurations/Database.js');
const { webHooks } = require('./Webhooks/Stirpe.js');
const { sendEmail } = require('./Services/Nodemailer.service.js');
const { ForgotPasswordTemplate } = require('./Templates/ForgotPasswordTemplate.js');
const { NODE_ENV } = require('./Enums/OurConstant.js');

const app = express();

const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.post('/api/v1/post/webhook', express.raw({ type: 'application/json' }), webHooks);

app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('Server online and ready for lift-off!');
});
app.use('/api/v1', mainRouter);
// const abc = async () => {
//   try {
//     sendEmail('junaidhunani890@gmail.com', 'Reset Your Profit Buddy Password', ForgotPasswordTemplate('https'));
//   } catch (error) {
//     console.log(error);
//   }
// };
// abc();
(async () => {
  try {
    await connectDB();
    if (NODE_ENV === 'local') {
      const PORT = process.env.PORT || 2000;
      app.listen(PORT, () => {
        console.log(`🚀 Server is running on http://localhost:${PORT}`);
      });
    }
  } catch (err) {
    console.error('❌ Failed to connect to DB:', err);
    process.exit(1);
  }
})();

module.exports = app;
