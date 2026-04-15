const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendMatchEmail(meet) {
  const isMock = !process.env.EMAIL_USER || !process.env.EMAIL_PASS;
  
  for (const email of meet.participants) {
    const others = meet.nicknames.filter((_, i) => meet.participants[i] !== email);
    
    let subject = "🎉 Meeter: You've been matched!";
    let htmlText = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
        <h2 style="color: #ff477e;">You're meeting up!</h2>
        <p>We've successfully scheduled an anonymous match based on your vibes: <strong>${meet.tags.join(', ')}</strong>.</p>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Venue:</strong> ${meet.venue}</p>
          <p style="margin: 5px 0;"><strong>Date:</strong> ${meet.date}</p>
          <p style="margin: 5px 0;"><strong>Time:</strong> ${meet.time}</p>
          <p style="margin: 5px 0;"><strong>You are meeting:</strong> ${others.join(', ')}</p>
        </div>
        <p style="font-size: 0.9em; color: #555;">Don't forget to confirm your attendance on the dashboard once you arrive so everyone gets their Credits!</p>
      </div>
    `;

    if (isMock) {
       console.log(`\n📧 [MOCK EMAIL DISPATCHED] -> Target: ${email}\nSummary: Matched at ${meet.venue} at ${meet.time} vs [${others.join(', ')}]\n`);
    } else {
       try {
         await transporter.sendMail({
           from: '"Meeter Campus" <updates@meeter.kgp>',
           to: email,
           subject: subject,
           html: htmlText
         });
       } catch (err) {
         console.error('[Mailer] Failed to send email to', email, err);
       }
    }
  }
}

module.exports = { sendMatchEmail };
