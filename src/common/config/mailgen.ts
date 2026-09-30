/* eslint-disable @typescript-eslint/no-var-requires */
const Mailgen = require('mailgen');

export const mailGenerator = new Mailgen({
  theme: 'default',
  product: {
    name: 'PLACEDEV PORTAL',
    link: 'https://devverify.pl.gov.ng/',
    logo: 'https://res.cloudinary.com/dvikxcdh3/image/upload/v1716814797/pictda_asm3qg.png',
    logoHeight: '100px',
  },
});
