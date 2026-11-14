/**
 * English translation of the legal texts. The German version prevails.
 * Also shown for French and Italian until those translations exist.
 */
import { LEGAL_VERSION, type LegalDocument, OPERATOR } from './types';

const contact = `${OPERATOR.name}, ${OPERATOR.address}, email: ${OPERATOR.email}`;
const note = 'This is a translation. In case of doubt, the German version prevails.';

export const privacyEn: LegalDocument = {
  title: 'Privacy Policy',
  updated: LEGAL_VERSION,
  intro: `This policy explains which personal data the DayShot app processes, why, and what rights you have, under the Swiss Data Protection Act (FADP) and, where applicable, the EU GDPR. ${note}`,
  sections: [
    { heading: '1. Controller', paragraphs: [`The controller is: ${contact}.`] },
    {
      heading: '2. Data we process',
      paragraphs: [
        'Account: email, password (stored encrypted only), username, display name, profile photo, year of birth (age check only, never shown to others), time and version of accepted terms.',
        'Content: your daily photos with date and visibility, comments, your own posts in the Discover feed, chat messages, friendships, blocks and reports.',
        'Technical data: IP address and time of requests (server logs), device type and operating system, push token.',
        'Printed calendar orders: name, shipping address, email, products and payment status. We never receive card data; Stripe processes payments.',
        'Subscriptions: receipts and subscription status from the App Store or Google Play.',
        'We do not sell data. The app currently shows no advertising and uses no advertising or tracking technology. If we introduce advertising, we will update this policy beforehand and ask for your consent where the law requires it.',
      ],
    },
    {
      heading: '3. Purposes and legal bases',
      paragraphs: [
        'Providing the app and your account, showing your photos to you and the people you choose, chat and comments (contract, Art. 6(1)(b) GDPR).',
        'Security, abuse prevention, handling reports and enforcing the terms (legitimate interest, Art. 6(1)(f) GDPR).',
        'Push notifications only with your consent in the operating system (Art. 6(1)(a) GDPR), revocable at any time.',
        'Processing orders and subscriptions and keeping accounting records (contract and legal obligation).',
      ],
    },
    {
      heading: '4. Who sees your content',
      paragraphs: [
        '"Friends only" photos (default) are visible to you and your confirmed friends. "Public" means all signed-in users. Username, display name, profile photo, comments and Discover posts are visible to signed-in users. Chat messages are visible only to sender and recipient.',
      ],
    },
    {
      heading: '5. Recipients and processors',
      paragraphs: [
        'Supabase Inc. (database, storage, sign-in) with data stored in London (UK, adequacy decisions by Switzerland and the EU); Expo (USA, app updates and push); Apple and Google (distribution, push, in-app purchases); RevenueCat (USA, subscriptions, if offered); Stripe Payments Europe (Ireland, payments); Gelato AS (Norway) and its print partners (printing and shipping); Wikimedia Foundation (USA, images in the Discover feed, receives your IP address).',
        'Transfers to countries without adequate protection rely on EU Standard Contractual Clauses or the Swiss-U.S./EU-U.S. Data Privacy Framework where the recipient is certified.',
      ],
    },
    {
      heading: '6. Retention and deletion',
      paragraphs: [
        'Data is kept while your account exists. You can delete your account in the app (Profile > Delete account); profile, photos, comments, posts and messages you sent are deleted immediately. Reports are kept up to 12 months, accounting records 10 years, server logs at most 30 days.',
      ],
    },
    {
      heading: '7. Minimum age',
      paragraphs: [
        'DayShot is for people aged 16 and over. Accounts of younger people are deleted.',
      ],
    },
    {
      heading: '8. Your rights',
      paragraphs: [
        `You have the right to access, rectification, erasure, restriction, data portability and objection, and may withdraw consent at any time. Contact ${OPERATOR.email}; we reply within 30 days. You may complain to the Swiss FDPIC or, in the EU, to your local supervisory authority.`,
      ],
    },
    {
      heading: '9. Security',
      paragraphs: [
        'Connections are encrypted (HTTPS). Database access is protected by Row Level Security; private photos are only available through time-limited links. Secret keys exist only on the server.',
      ],
    },
    {
      heading: '10. Changes',
      paragraphs: [
        'We update this policy when the app or the law changes and inform you in the app about material changes.',
      ],
    },
  ],
};

export const termsEn: LegalDocument = {
  title: 'Terms of Use',
  updated: LEGAL_VERSION,
  intro: `These terms govern the use of the DayShot app, operated by ${OPERATOR.name}. By signing up you accept them. ${note}`,
  sections: [
    {
      heading: '1. Account',
      paragraphs: [
        'You must be at least 16, provide truthful information and keep your password secret. One account per person.',
      ],
    },
    {
      heading: '2. Your content',
      paragraphs: [
        'You keep the rights to your photos and texts. You grant us a simple, free, worldwide licence to store, process and show them to the people you choose; it ends when you delete the content or your account. Only upload content you have the rights to, and get consent from people you show.',
      ],
    },
    {
      heading: '3. Prohibited content (zero tolerance)',
      paragraphs: [
        'Prohibited are in particular nudity and sexual content, any sexualised depiction of minors, violence, hate, discrimination, harassment, bullying, threats, spam and advertising, illegal content and infringement of copyright or personal rights. There is zero tolerance for objectionable content and abusive users.',
      ],
    },
    {
      heading: '4. Reporting, blocking and moderation',
      paragraphs: [
        'You can report any content or person and block users. We review reports within 24 hours, remove prohibited content and suspend or delete accounts that violate these terms. We may report illegal content to the authorities.',
      ],
    },
    {
      heading: '5. Discover feed',
      paragraphs: [
        'Automatic facts come from freely licensed sources (e.g. Wikipedia, CC BY-SA) and link to their source; we do not guarantee their accuracy. Own posts are limited to 5 per day.',
      ],
    },
    {
      heading: '6. Subscription (if offered)',
      paragraphs: [
        'Subscriptions are sold through the App Store or Google Play under their terms. They renew automatically unless cancelled at least 24 hours before the end of the period in your store account settings.',
      ],
    },
    {
      heading: '7. Printed calendars',
      paragraphs: [
        'Prices are shown including VAT and shipping before ordering. Payment is processed by Stripe; printing and shipping by Gelato. Calendars are personalised, so there is no right of withdrawal (for EU customers: Art. 16(c) Directive 2011/83/EU). Damaged items are replaced or refunded if reported with a photo within 14 days of receipt.',
      ],
    },
    {
      heading: '8. Availability and changes',
      paragraphs: [
        'We aim for reliable operation but cannot guarantee it and may change or discontinue features. We inform you in the app about material changes to these terms.',
      ],
    },
    {
      heading: '9. Liability',
      paragraphs: [
        "We are liable only for intent and gross negligence, as far as permitted by law, and not for other users' content. Please back up important photos yourself.",
      ],
    },
    {
      heading: '10. Termination',
      paragraphs: [
        'You can delete your account at any time in the app. We may suspend or delete accounts for violations.',
      ],
    },
    {
      heading: '11. Law and jurisdiction',
      paragraphs: [
        `Swiss law applies. Place of jurisdiction is [OPERATOR'S LOCATION], subject to mandatory consumer protection rules. Contact: ${contact}.`,
      ],
    },
  ],
};
