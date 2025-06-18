import imaps from 'imap-simple';
import { simpleParser } from 'mailparser';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const config = {
  imap: {
    user: process.env.IMAP_USER,
    password: process.env.IMAP_PASSWORD,
    host: process.env.IMAP_HOST,
    port: parseInt(process.env.IMAP_PORT),
    tls: true,
    authTimeout: 3000,
  }
};

async function checkMail() {
  try {
    const connection = await imaps.connect(config);
    await connection.openBox('INBOX');

    const searchCriteria = ['UNSEEN'];
    const fetchOptions = { bodies: [''] };

    const messages = await connection.search(searchCriteria, fetchOptions);

    for (const item of messages) {
      const all = item.parts.find(part => part.which === '');
      const raw = all.body;

      const parsed = await simpleParser(raw);

      const mailData = {
        from: parsed.from.text,
        to: parsed.to.text,
        subject: parsed.subject,
        date: parsed.date,
        text: parsed.text,
        html: parsed.html,
      };

      console.log('Yeni mail:', mailData);

      await axios.post(process.env.WEBHOOK_URL, mailData);

      const uid = item.attributes.uid;
      await connection.addFlags(uid, '\\Seen');
    }

    connection.end();

  } catch (err) {
    console.error('Mail kontrol hatası:', err);
  }
}

setInterval(checkMail, 2 * 60 * 1000);

checkMail();
