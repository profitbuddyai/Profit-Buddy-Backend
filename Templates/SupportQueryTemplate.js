const SupportQueryTemplate = (userEmail = '', query = '') => {
  return `<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <title>New Support Query</title>
  <style>
    body {
      background-color: #F8F9FC;
      color: #666666;
      font-family: 'Google Sans', 'sans-serif' !important;
      margin: 0;
      padding: 0;
      width: 100%;
    }

    .container {
      width: 100%;
      max-width: 600px;
      margin: auto;
      background-color: #F8F9FC;
      border: 1px solid lightgray;
      border-radius: 10px;
      overflow: hidden;
    }

    .header {
      text-align: center;
      padding: 10px 0px;
      width: 100%;
      background-color: #282828;
    }

    .logo {
      width: 60px;
    }

    .header h1 {
      display: none;
      margin: 0;
      color: #ffffff;
      font-size: 15px;
    }

    .content {
      line-height: 1.5;
      background-color: #ffffff;
      padding: 20px 37px;
      border-radius: 10px;
      border: 1px solid lightgray;
      margin: 20px 20px;
    }

    .content h1 {
      color: #131313;
      text-align: center;
      margin: 0px;
    }

    .content p {
      margin: 16px 0;
      color: #666666;
    }

    .highlight {
      background: #F8F9FC;
      border: 1px solid #e2e2e2;
      padding: 12px;
      border-radius: 8px;
      font-size: 14px;
      color: #333333;
      white-space: pre-wrap;
    }

    .footer {
      margin-top: 30px;
      font-size: 12px;
      color: #999999;
      text-align: center;
    }

    .footer a {
      color: #2dcb9e;
      text-decoration: none;
    }

    @media (prefers-color-scheme: dark) {
      body {
        background-color: #171717;
        color: #a1a1a1;
      }

      .container {
        background-color: #000000;
        border: 1px solid rgba(255, 255, 255, 0.2);
      }

      .header h1 {
        color: #ffffff;
      }

      .footer {
        color: #888888;
        font-size: 15px;
      }
    }
  </style>
</head>

<body>
  <div class="container">
    <div class="header">
      <img src="https://profit-buddy-ai.vercel.app/assets/White-DLgQlnKq.png" alt="Profit Buddy Logo" class="logo" />
      <h1>Profit Buddy</h1>
    </div>

    <div class="content">
      <h1>New Support Query</h1>
      <p>Hello Admin,</p>
      <p>A new support query has been submitted by:</p>
      <p><strong>Email:</strong> ${userEmail}</p>
      <p><strong>Message:</strong></p>
      <div class="highlight">${query}</div>
      <p>Please respond to the user at the email address provided.</p>
    </div>

    <div class="footer">
      <p style="font-size: 13px; color: #1d1d1d; font-weight: 600;">
        Profit Buddy Support Notification
      </p>
      <p style="font-size: 15px;">Thanks,</p>
    </div>
  </div>
</body>

</html>`;
};

module.exports = { SupportQueryTemplate };