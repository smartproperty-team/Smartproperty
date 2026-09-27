// ===========================================
// SmartProperty - Privacy Policy and Terms of Use
// ===========================================
//
// Every statement here describes what the code actually does. If a feature
// changes (a new provider, private document storage, an account-deletion
// button), update the matching section and LEGAL_UPDATED.
//
// Placeholders rendered as links: {email} (privacy contact),
// {privacy} and {terms} (the other legal page).

import type { Language } from "../../i18n";

export const LEGAL_CONTACT_EMAIL = "daagiwael99@gmail.com";
export const LEGAL_UPDATED = "2026-09-27";

export interface LegalSection {
  heading: string;
  paragraphs?: string[];
  items?: string[];
}

export interface LegalDocument {
  title: string;
  intro: string;
  sections: LegalSection[];
}

interface LegalCopy {
  updated: string;
  onThisPage: string;
  privacy: LegalDocument;
  terms: LegalDocument;
}

export const legalContent: Record<Language, LegalCopy> = {
  en: {
    updated: "Last updated",
    onThisPage: "On this page",
    privacy: {
      title: "Privacy Policy",
      intro:
        "SmartProperty is a student project built at ESPRIT in Tunisia: a working demonstration of a property platform, not a registered business. This page explains in plain terms what the site stores about you, why, who else handles it, and how to have it removed.",
      sections: [
        {
          heading: "What we collect",
          items: [
            "Account details: your name, email address, and optionally a phone number and profile photo, plus your role. Your password is stored only as a salted hash, never in readable form.",
            "Google or Facebook sign-in: if you use it, the name, email address and profile picture that service shares with us.",
            "Verification documents: if you choose to verify as a tenant, the identity document and proof of income you upload.",
            "What you create: listings and their photos, applications, leases, maintenance requests, reviews and favourites.",
            "Preferences: the property types, budget, locations and notification settings you choose.",
            "Sessions: for each device you sign in on, the device type, IP address and approximate location, so you can see and end your sessions.",
          ],
        },
        {
          heading: "Why we use it",
          items: [
            "To run your account and the features you use: listings, applications, leases, payments and maintenance requests.",
            "To review tenant verification: SmartProperty administrators check the documents you upload to confirm your identity and income.",
            "To keep accounts secure: the list of active sessions, limits on repeated sign-in attempts, and reCAPTCHA on the sign-in and sign-up forms.",
          ],
          paragraphs: [
            "We do not sell your data, share it for advertising, or use analytics or advertising cookies.",
          ],
        },
        {
          heading: "Who else handles it",
          paragraphs: [
            "These services process data on our behalf to run the site:",
          ],
          items: [
            "Microsoft Azure: hosts the application, in the European Union (Italy).",
            "MongoDB Atlas: stores the database.",
            "Cloudflare: delivers the website and stores uploaded photos and documents.",
            "Stripe: processes card payments when payments are enabled. SmartProperty never receives your card number.",
            "Google and Facebook: only if you choose to sign in with them. Google reCAPTCHA: spam and abuse protection on sign-in and sign-up.",
            "OpenStreetMap: maps and address lookup. Your browser loads map images directly from their servers.",
          ],
        },
        {
          heading: "How uploaded files are stored",
          paragraphs: [
            "Verification documents are kept in private storage that cannot be reached from the internet. The site shows a document only to its owner and to the administrators who review it, through a link that stops working after 10 minutes.",
            "Photos you add to a listing, and your profile photo, are public: anyone with their link can see them.",
            "Because this is a demonstration, please upload sample documents rather than your real identity or income documents.",
          ],
        },
        {
          heading: "How long we keep it",
          paragraphs: [
            "Your data is kept for as long as your account exists. To delete your account and everything linked to it, including uploaded documents, email {email}. We will confirm once it is done.",
          ],
        },
        {
          heading: "Your choices and rights",
          items: [
            "See and correct your details on your profile page.",
            "End sessions on other devices from the sessions page.",
            "Change notification settings at any time.",
            "Ask for a copy of your data, or for its deletion, by email.",
          ],
          paragraphs: [
            "Depending on where you live, data protection law, such as Tunisia's Organic Law No. 2004-63 or the EU's GDPR, gives you these rights. Email {email} to use them.",
          ],
        },
        {
          heading: "What your browser stores",
          paragraphs: [
            "The site keeps a few items in your browser's local storage: what keeps you signed in, your language choice, your saved preferences, and an unsent draft of the listing form. There are no advertising or tracking cookies.",
          ],
        },
        {
          heading: "Contact and changes",
          paragraphs: [
            "Questions or requests about your data: {email}.",
            "If this policy changes, the date at the top changes too. Our {terms} explain the rules for using the site.",
          ],
        },
      ],
    },
    terms: {
      title: "Terms of Use",
      intro:
        "These terms explain the rules for using SmartProperty. By creating an account or using the site, you accept them.",
      sections: [
        {
          heading: "About this site",
          paragraphs: [
            "SmartProperty is a student project built at ESPRIT in Tunisia. It is a working demonstration of a property platform, provided for learning and evaluation, not a registered business. Features may change, and the site may be reset or taken offline without notice.",
            "Many listings are sample data created for the demonstration and are not real offers.",
          ],
        },
        {
          heading: "Your account",
          items: [
            "Give accurate information and keep it up to date.",
            "Keep your password private. You are responsible for what happens under your account.",
            "One person per account. Do not sign up on someone else's behalf without their permission.",
          ],
        },
        {
          heading: "Listings and content",
          items: [
            "Owners are responsible for their listings being accurate and lawful, and for having the right to use the photos they upload.",
            "Reviews must reflect your own experience.",
            "We may remove content or suspend accounts that break these terms.",
          ],
        },
        {
          heading: "Applications, leases and payments",
          paragraphs: [
            "SmartProperty is a tool that helps tenants and owners organise a rental or sale. It is not a party to any agreement between them, and it does not check that listings are available or accurately described.",
            "When payments are enabled, they are processed by Stripe under Stripe's own terms.",
          ],
        },
        {
          heading: "Acceptable use",
          items: [
            "No unlawful, misleading or offensive content.",
            "No impersonating other people or organisations.",
            "No attempts to access other people's data or accounts, or to break the site's security.",
            "No automated collection of data that overloads the site.",
          ],
        },
        {
          heading: "No guarantees",
          paragraphs: [
            "The site is provided as it is, as a demonstration. It may contain errors and may not always be available. To the extent the law allows, we are not responsible for decisions made on the basis of information shown on it.",
          ],
        },
        {
          heading: "Privacy, contact and changes",
          paragraphs: [
            "How we handle personal data is described in our {privacy}.",
            "Questions about these terms: {email}. If they change, the date at the top changes too.",
          ],
        },
      ],
    },
  },
  fr: {
    updated: "Dernière mise à jour",
    onThisPage: "Sur cette page",
    privacy: {
      title: "Politique de confidentialité",
      intro:
        "SmartProperty est un projet étudiant réalisé à ESPRIT, en Tunisie : une démonstration fonctionnelle d'une plateforme immobilière, et non une entreprise enregistrée. Cette page explique simplement ce que le site conserve sur vous, pourquoi, qui d'autre le traite et comment le faire supprimer.",
      sections: [
        {
          heading: "Ce que nous collectons",
          items: [
            "Informations de compte : votre nom, votre adresse e-mail et, si vous le souhaitez, un numéro de téléphone et une photo de profil, ainsi que votre rôle. Votre mot de passe est uniquement conservé sous forme d'empreinte salée, jamais en clair.",
            "Connexion avec Google ou Facebook : si vous l'utilisez, le nom, l'adresse e-mail et la photo de profil que ce service nous transmet.",
            "Documents de vérification : si vous choisissez de vous faire vérifier en tant que locataire, la pièce d'identité et le justificatif de revenus que vous déposez.",
            "Ce que vous créez : annonces et leurs photos, candidatures, baux, demandes de maintenance, avis et favoris.",
            "Préférences : les types de biens, le budget, les lieux et les réglages de notification que vous choisissez.",
            "Sessions : pour chaque appareil sur lequel vous vous connectez, le type d'appareil, l'adresse IP et la localisation approximative, afin que vous puissiez voir et fermer vos sessions.",
          ],
        },
        {
          heading: "Pourquoi nous les utilisons",
          items: [
            "Pour faire fonctionner votre compte et les fonctionnalités que vous utilisez : annonces, candidatures, baux, paiements et demandes de maintenance.",
            "Pour la vérification des locataires : les administrateurs de SmartProperty examinent les documents déposés afin de confirmer votre identité et vos revenus.",
            "Pour sécuriser les comptes : la liste des sessions actives, la limitation des tentatives de connexion répétées et reCAPTCHA sur les formulaires de connexion et d'inscription.",
          ],
          paragraphs: [
            "Nous ne vendons pas vos données, ne les partageons pas à des fins publicitaires et n'utilisons pas de cookies d'analyse ou de publicité.",
          ],
        },
        {
          heading: "Qui d'autre les traite",
          paragraphs: [
            "Ces services traitent des données pour notre compte afin de faire fonctionner le site :",
          ],
          items: [
            "Microsoft Azure : héberge l'application, dans l'Union européenne (Italie).",
            "MongoDB Atlas : héberge la base de données.",
            "Cloudflare : diffuse le site et stocke les photos et documents déposés.",
            "Stripe : traite les paiements par carte lorsque les paiements sont activés. SmartProperty ne reçoit jamais votre numéro de carte.",
            "Google et Facebook : uniquement si vous choisissez de vous connecter avec eux. Google reCAPTCHA : protection contre le spam et les abus sur la connexion et l'inscription.",
            "OpenStreetMap : cartes et recherche d'adresses. Votre navigateur charge les images de carte directement depuis leurs serveurs.",
          ],
        },
        {
          heading: "Comment les fichiers déposés sont stockés",
          paragraphs: [
            "Les documents de vérification sont conservés dans un espace de stockage privé, inaccessible depuis Internet. Le site n'affiche un document qu'à son propriétaire et aux administrateurs qui l'examinent, au moyen d'un lien qui cesse de fonctionner au bout de 10 minutes.",
            "Les photos que vous ajoutez à une annonce, ainsi que votre photo de profil, sont publiques : toute personne disposant de leur lien peut les voir.",
            "Comme il s'agit d'une démonstration, merci de déposer des documents d'exemple plutôt que vos véritables pièces d'identité ou justificatifs de revenus.",
          ],
        },
        {
          heading: "Durée de conservation",
          paragraphs: [
            "Vos données sont conservées tant que votre compte existe. Pour supprimer votre compte et tout ce qui y est lié, y compris les documents déposés, écrivez à {email}. Nous vous confirmerons la suppression.",
          ],
        },
        {
          heading: "Vos choix et vos droits",
          items: [
            "Consulter et corriger vos informations sur votre page de profil.",
            "Fermer les sessions ouvertes sur d'autres appareils depuis la page des sessions.",
            "Modifier vos réglages de notification à tout moment.",
            "Demander une copie de vos données, ou leur suppression, par e-mail.",
          ],
          paragraphs: [
            "Selon votre lieu de résidence, la loi sur la protection des données, comme la loi organique tunisienne n° 2004-63 ou le RGPD de l'Union européenne, vous accorde ces droits. Écrivez à {email} pour les exercer.",
          ],
        },
        {
          heading: "Ce que votre navigateur conserve",
          paragraphs: [
            "Le site conserve quelques éléments dans le stockage local de votre navigateur : ce qui vous garde connecté, votre choix de langue, vos préférences enregistrées et un brouillon non envoyé du formulaire d'annonce. Il n'y a aucun cookie publicitaire ou de suivi.",
          ],
        },
        {
          heading: "Contact et modifications",
          paragraphs: [
            "Questions ou demandes concernant vos données : {email}.",
            "Si cette politique change, la date en haut de page change aussi. Nos {terms} expliquent les règles d'utilisation du site.",
          ],
        },
      ],
    },
    terms: {
      title: "Conditions d'utilisation",
      intro:
        "Ces conditions expliquent les règles d'utilisation de SmartProperty. En créant un compte ou en utilisant le site, vous les acceptez.",
      sections: [
        {
          heading: "À propos de ce site",
          paragraphs: [
            "SmartProperty est un projet étudiant réalisé à ESPRIT, en Tunisie. C'est une démonstration fonctionnelle d'une plateforme immobilière, fournie à des fins d'apprentissage et d'évaluation, et non une entreprise enregistrée. Les fonctionnalités peuvent évoluer, et le site peut être réinitialisé ou mis hors ligne sans préavis.",
            "De nombreuses annonces sont des données d'exemple créées pour la démonstration et ne sont pas de véritables offres.",
          ],
        },
        {
          heading: "Votre compte",
          items: [
            "Fournissez des informations exactes et tenez-les à jour.",
            "Gardez votre mot de passe secret. Vous êtes responsable de ce qui se passe avec votre compte.",
            "Un compte par personne. N'inscrivez personne sans son accord.",
          ],
        },
        {
          heading: "Annonces et contenus",
          items: [
            "Les propriétaires sont responsables de l'exactitude et de la légalité de leurs annonces, ainsi que de leur droit d'utiliser les photos qu'ils déposent.",
            "Les avis doivent refléter votre propre expérience.",
            "Nous pouvons retirer des contenus ou suspendre des comptes qui ne respectent pas ces conditions.",
          ],
        },
        {
          heading: "Candidatures, baux et paiements",
          paragraphs: [
            "SmartProperty est un outil qui aide locataires et propriétaires à organiser une location ou une vente. Il n'est partie à aucun accord entre eux et ne vérifie pas que les annonces sont disponibles ou décrites avec exactitude.",
            "Lorsque les paiements sont activés, ils sont traités par Stripe selon ses propres conditions.",
          ],
        },
        {
          heading: "Utilisation acceptable",
          items: [
            "Aucun contenu illégal, trompeur ou offensant.",
            "Ne vous faites pas passer pour une autre personne ou organisation.",
            "N'essayez pas d'accéder aux données ou aux comptes d'autres personnes, ni de contourner la sécurité du site.",
            "Pas de collecte automatisée de données qui surcharge le site.",
          ],
        },
        {
          heading: "Aucune garantie",
          paragraphs: [
            "Le site est fourni tel quel, à titre de démonstration. Il peut contenir des erreurs et ne pas toujours être disponible. Dans la mesure permise par la loi, nous ne sommes pas responsables des décisions prises sur la base des informations qui y figurent.",
          ],
        },
        {
          heading: "Confidentialité, contact et modifications",
          paragraphs: [
            "La manière dont nous traitons les données personnelles est décrite dans notre {privacy}.",
            "Questions sur ces conditions : {email}. Si elles changent, la date en haut de page change aussi.",
          ],
        },
      ],
    },
  },
};
