# CRM iciGauthier

Un CRM local pour ton activité de courtier hypothécaire. **Tout reste sur ton
ordinateur** (privé, conforme à la Loi 25 / PIPEDA).

---

## ▶️ Démarrer le CRM

**Double-clique sur `Demarrer-CRM.cmd`.**

- Une fenêtre noire s'ouvre (c'est le serveur — laisse-la ouverte).
- Ton navigateur ouvre le CRM tout seul sur `http://localhost:4321`.
- Pour arrêter : ferme la fenêtre noire.

*(Astuce : clic droit sur `Demarrer-CRM.cmd` → « Envoyer vers » → « Bureau
(créer un raccourci) » pour l'avoir sur ton bureau.)*

---

## 🗂️ Les sections (barre de gauche)

- **Pipeline** : tableau visuel — glisse les fiches d'une colonne à l'autre
  (Nouveau lead → Contacté → Pré-approuvé → En dossier → Financé → Perdu).
  « + Nouveau client » pour ajouter, clique une fiche pour la modifier (notes
  datées, prochain suivi…).
- **Agenda** : calendrier mensuel. Clique un jour (ou « + Nouvelle rencontre »)
  pour ajouter une rencontre (titre, type, heure, client lié, lieu, notes).
  - **Sans connexion Outlook** : les rencontres restent dans le CRM ; le bouton
    « Ajouter à Outlook » télécharge un fichier `.ics` à ouvrir dans Outlook.
  - **Avec connexion Outlook** (voir plus bas) : l'agenda affiche ton **vrai
    calendrier Outlook** et les rencontres que tu crées vont **directement dans
    Outlook**.

## 🔗 Relier l'agenda à ton Outlook (une seule fois)

Microsoft exige d'inscrire une petite app (gratuite) pour autoriser l'accès à
ton calendrier. Étapes :

1. Va sur **entra.microsoft.com** → **Applications** → **Inscriptions
   d'applications** → **Nouvelle inscription**.
2. **Nom** : `CRM iciGauthier` (n'importe quoi). **Types de comptes** : choisis
   *« Comptes dans un annuaire organisationnel et comptes Microsoft personnels »*.
   Clique **Inscrire**.
3. Onglet **Authentification** → **Ajouter une plateforme** → **Applications
   mobiles et de bureau** → ajoute l'URI :
   `http://localhost:4321/auth/callback`. Plus bas, mets **« Autoriser les flux
   de client public »** à **Oui**. Enregistre.
4. Onglet **Autorisations d'API** → **Ajouter** → **Microsoft Graph** →
   **Autorisations déléguées** → coche **Calendars.ReadWrite** et **User.Read**.
5. Retourne sur **Vue d'ensemble** et copie l'**ID d'application (client)**.
6. Colle-le dans `crm/data/config.json` :
   ```json
   { "msClientId": "colle-l-id-ici", "timezone": "America/Toronto" }
   ```
7. **Redémarre le CRM**, va dans **Agenda** → **« Se connecter à Outlook »** →
   connecte-toi avec ton compte Microsoft et accepte. C'est fait ✅

Ensuite, tes rencontres du CRM apparaissent dans Outlook, et ton calendrier
Outlook s'affiche dans le CRM.
- **Contacts** : la liste complète de tes clients en tableau, avec recherche.
- **Partenaires** : tes prêteurs, notaires, courtiers immobiliers, références…
- **Performance** : tes indicateurs (volume financé, valeur du pipeline, taux de
  conversion, suivis à faire) + répartition du pipeline.

Pour poser des questions sur tes données (« quels suivis cette semaine ? »,
« résume mes dossiers »…), utilise **l'application Claude** directement — le
fichier `crm/data/crm.json` est lisible par Claude Code.

---

## 🤖 Relié avec Claude

Toutes tes données sont dans un seul fichier :

> `crm/data/crm.json`

Claude (dans l'app Claude Code) peut **lire et modifier ce fichier**. Donc tu
peux lui demander, par exemple :

- « Voici un courriel de lead : [copier-coller]. Ajoute-le au CRM. »
- « Quels suivis j'ai à faire cette semaine ? »
- « Passe le dossier de Marie Tremblay à "Financé". »
- « Fais-moi un résumé de mes dossiers actifs. »

Après une modification faite par Claude, **rafraîchis** la page du CRM (ou clique
le bouton ↻) pour voir les changements.

⚠️ Idéalement, évite de modifier une fiche dans l'app **en même temps** que
Claude modifie le fichier, pour ne pas écraser un changement.

---

## 💾 Sauvegarde

Ton fichier `data/crm.json` est ta base de données. Comme le dossier est dans
OneDrive, il est déjà sauvegardé dans le nuage. Tu peux aussi le copier ailleurs
de temps en temps.
