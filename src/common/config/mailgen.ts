import Mailgen from 'mailgen';

export const mailGenerator = new Mailgen({
  theme: 'default',
  product: {
    // Appears in header & footer of e-mails
    name: 'PLACEDEV PORTAL',
    link: 'https://placedevportal.org/',
    logo: 'https://res.cloudinary.com/nhubnacademy/image/upload/v1694827989/foundation_x0lse4.png',
    logoHeight: '100px',
  },
});
