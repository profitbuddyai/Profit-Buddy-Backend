const DeleteAccountVerificationTemplate = (deleteLink = '') => {
  return `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <title>Confirm Account Deletion</title>
    <style>
        body {
            background-color: #F8F9FC;
            color: #666666;
            font-family: 'Google Sans', sans-serif;
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

        .btn {
            display: inline-block;
            padding: 10px 25px;
            background-color: #e63946; /* Red for warning */
            color: #ffffff !important;
            text-decoration: none;
            font-weight: bold;
            font-size: 16px;
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

            .btn {
                background-color: #ff4d5a;
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
            <h1>Confirm Account Deletion</h1>
            <p>Hey Buddy,</p>
            <p>We received a request to permanently delete your Profit Buddy account. Once your account is deleted, all your data will be removed and cannot be recovered.</p>
            <p style="text-align: center;">
                <a href="${deleteLink}" target="_blank" class="btn">Confirm Deletion</a>
            </p>
            <p>If the button above doesn’t work, copy and paste the following link into your browser:</p>
            <p><a href="${deleteLink}" target="_blank" style="color: #e63946;">${deleteLink}</a></p>
            <p>This link will expire in <strong>15 minutes</strong>.</p>
            <p>If you didn’t request to delete your account, you can safely ignore this email and your account will remain active.</p>
        </div>
        <div class="footer">
            <p style="font-size: 13px; color: #1d1d1d; font-weight: 600;">Questions? Contact Us <a href="mailto:admin@profitbuddy.ai">admin@profitbuddy.ai</a></p>
            <p style="font-size: 15px;">Thanks,</p>
        </div>
    </div>
</body>

</html>`;
};

module.exports = { DeleteAccountVerificationTemplate };
