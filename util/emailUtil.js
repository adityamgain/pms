const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'amgainaditya@gmail.com',
    pass: 'qqfu tqct uaye gqbk',   
    // create pass from google app pass
  },
}, {
  from: 'ANSAB amgainaditya@gmail.com', // Default sender info
});

transporter.verify((error, success) => {
  if (error) {
    console.error('SMTP connection error:', error);
  } else {
    console.log('SMTP server is ready to send emails');
  }
});

module.exports = {
  sendPasswordToEmail: async (email, password) => {
    try {
      const info = await transporter.sendMail({
        to: email,
        subject: 'Welcome to ANSAB - Your Login Credentials',
        text: `
Dear sir/maam,

    Welcome to ANSAB! We are excited to have you on board and look forward to your contributions to our organization.
    Below are your login credentials for accessing the system:

    Username:    ${email}
    Password:    ${password}

    Please log in to your account and change your password at your earliest convenience to ensure security. If you have any issues or questions, feel free to contact us.

Best regards,  
ANSAB Team
        `,      });
      console.log('Email sent:', info.response);
    } catch (error) {
      console.error('Error sending email:', error);
    }
  },
};
