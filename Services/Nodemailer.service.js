const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: 'mail.privateemail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.NODEMAIL_EMAIL,
      pass: process.env.NODEMAIL_PASS,
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
  });
};

const sendEmail = async (to, subject, html) => {
  const mailOptions = {
    from: `Profit Buddy <${process.env.NODEMAIL_EMAIL}>`,
    to,
    subject,
    html,
  };

  const transporter = createTransporter();

  try {
    const info = await transporter.sendMail(mailOptions);
    return `Email sent: ${info.response}`;
  } catch (error) {
    console.log(error);

    throw new Error({ message: `Error sending email: ${error.message}` });
  }
};

module.exports = { sendEmail };
