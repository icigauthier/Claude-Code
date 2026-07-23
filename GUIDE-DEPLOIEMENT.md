# 📱 Mettre ton CRM en ligne (accessible partout, sécurisé)

Ce guide te permet de rendre ton CRM accessible sur **ton téléphone et tes
autres ordinateurs**, protégé par un **mot de passe**, **gratuitement**.

Tu vas utiliser 2 services gratuits :

- **MongoDB Atlas** — la « base de données » en ligne où vivent tes données
  (pour ne rien perdre quand le serveur gratuit redémarre).
- **Render** — l'hébergeur qui fait tourner ton CRM 24/7.

⏱️ Compte environ **30 minutes**, une seule fois.

> 💡 **À savoir sur le gratuit :** après ~15 min sans usage, le serveur
> « s'endort ». La 1ʳᵉ page après une pause prend **30-60 sec** à charger,
> puis c'est rapide. (Tu pourras passer au forfait payant de Render, ~7 $US/mois,
> pour supprimer ce délai quand tu voudras.)

---

## ⚠️ Étape 0 — Sécurité (à faire maintenant)

Tu m'as partagé des clés d'accès actives. Avant tout, **renouvelle-les** :

1. **Netlify** : Netlify → ton avatar → *User settings* → *Applications* →
   *Personal access tokens* → **révoque** l'ancien jeton et génère-en un nouveau.
2. **Microsoft** (par précaution) : [account.microsoft.com](https://account.microsoft.com)
   → *Sécurité* → applications ayant accès → retire **« CRM iciGauthier »**
   (tu te reconnecteras à Outlook plus tard).

---

## 🗄️ Étape 1 — Créer la base de données (MongoDB Atlas)

1. Va sur **[mongodb.com/cloud/atlas/register](https://www.mongodb.com/cloud/atlas/register)**
   et crée un compte gratuit.
2. Crée un cluster **gratuit (M0)**. Pour la région, choisis quelque chose de
   proche, ex. **AWS / N. Virginia (us-east-1)**. Clique *Create*.
3. **Database Access** (menu de gauche) → *Add New Database User* :
   - choisis un **nom d'utilisateur** et un **mot de passe** (note-les !) ;
   - garde le rôle par défaut *Read and write to any database*. → *Add User*.
4. **Network Access** → *Add IP Address* → clique **Allow access from anywhere**
   (`0.0.0.0/0`) → *Confirm*.
   *(Ta base reste protégée par le nom d'utilisateur + mot de passe.)*
5. **Database** → bouton **Connect** → *Drivers* → copie le **lien de connexion**.
   Il ressemble à :
   ```
   mongodb+srv://TON_USER:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   Remplace `<password>` par le mot de passe de l'étape 3. **Garde ce lien**,
   c'est ton `MONGODB_URI`.

---

## 📤 Étape 2 — Envoyer tes données actuelles dans la base

Depuis ton PC, dans le dossier du CRM, ouvre **PowerShell** et lance :

```powershell
$env:MONGODB_URI="colle-ici-ton-lien-mongodb"
npm run upload-data
```

Tu devrais voir : `✅ Données envoyées dans le nuage (...)`.
*(Tes clients, partenaires, tâches, etc. sont maintenant dans la base en ligne.)*

---

## 🚀 Étape 3 — Mettre le CRM en ligne (Render)

1. Va sur **[render.com](https://render.com)** et crée un compte
   (le plus simple : *Sign up with GitHub*).
2. Clique **New +** → **Blueprint**.
3. Connecte ton dépôt GitHub **`icigauthier/claude-code`** et choisis la branche
   **`claude/crm-multi-device-sync-hu2keg`**.
   Render lit le fichier `render.yaml` et prépare tout automatiquement.
4. Render va te demander **2 valeurs** :
   - **`CRM_PASSWORD`** → choisis un **mot de passe fort** (c'est celui qui
     protégera ton CRM ; ne le partage avec personne).
   - **`MONGODB_URI`** → colle le lien de l'étape 1.
   *(Le `SESSION_SECRET` est généré tout seul.)*
5. Clique **Apply** / **Create**. Render construit ton CRM (2-4 min).
6. Quand c'est prêt, tu obtiens une adresse du genre
   **`https://crm-icigauthier.onrender.com`**.

> Pas de bouton Blueprint ? Tu peux aussi faire **New + → Web Service**, choisir
> le dépôt + la branche, puis régler à la main : *Build* =
> `npm install --include=dev && npm run build`, *Start* = `node server.js`,
> *Plan* = **Free**, et ajouter les variables `NODE_ENV=production`,
> `CRM_PASSWORD`, `MONGODB_URI`.

---

## ✅ Étape 4 — Utiliser ton CRM partout

1. Ouvre ton adresse `…onrender.com` sur ton **téléphone** ou un **autre ordi**.
2. Une **page de connexion** apparaît → entre ton `CRM_PASSWORD` → te voilà dedans 🎉
3. Sur téléphone, tu peux l'**ajouter à l'écran d'accueil** (menu du navigateur
   → *Ajouter à l'écran d'accueil*) pour l'ouvrir comme une vraie app.

Tes données sont partagées entre tous tes appareils (tout est dans la base en ligne).

---

## ℹ️ Ce qui marche en ligne — et ce qui reste sur ton PC

**En ligne (téléphone + ordis) :** Pipeline, Vue d'ensemble, Agenda (mode local),
Contacts, Partenaires, À faire, Finance, Nouvelles, Performance. ✅

**Reste sur ton PC pour l'instant** (ça dépend de ton 2ᵉ projet `hypotheque-site`
et d'Outlook, qu'on branchera après) :
- le **Blog / journal** et l'**envoi d'infolettre** ;
- le bouton **« Déployer sur Netlify »** ;
- la **synchro Outlook** de l'agenda + l'import automatique des leads.

Ces boutons s'affichent « non configuré » en ligne : c'est normal, ils
continuent de fonctionner depuis ton PC comme avant.

> 🔜 **Phase 2 (quand tu voudras) :** je peux brancher Outlook sur la version en
> ligne (agenda + leads). Ça demande juste d'ajouter une adresse de redirection
> dans tes réglages Microsoft et 2-3 variables. Dis-le-moi et on le fait.

---

## 🔧 Aide-mémoire

- **Changer ton mot de passe :** Render → ton service → *Environment* → modifie
  `CRM_PASSWORD` → *Save* (le service redémarre seul).
- **Ton PC continue de marcher normalement** : sans ces variables, `Demarrer-CRM.cmd`
  ouvre le CRM en local dans `data/crm.json`, sans mot de passe, comme avant.
- **Mettre à jour tes données en ligne depuis ton PC :** relance
  `npm run upload-data` (⚠️ ça remplace la version en ligne par ta version locale).
- **Vie privée (Loi 25) :** tes données sont chez MongoDB/Render (États-Unis),
  chiffrées en transit (HTTPS) et protégées par mot de passe. Pour une résidence
  strictement canadienne, il faudra un forfait payant ou l'option « données sur
  ton PC » — dis-le-moi si c'est important pour toi.
