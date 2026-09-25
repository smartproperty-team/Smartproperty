# 🚀 GUIDE RAPIDE - Utiliser Swagger (Après Correction)

## ⚡ En 5 Étapes

### 1️⃣ Démarrer le Backend
```powershell
cd "C:\Users\wael daagi\Documents\GitHub\smartproperty\backend"
npm run start:dev
```
Attendez : `🚀 SmartProperty API running on: http://localhost:3000`

---

### 2️⃣ Ouvrir Swagger
**URL** : http://localhost:3000/api/docs

**⚠️ HARD REFRESH** : `Ctrl + Shift + R`

---

### 3️⃣ Se Connecter
1. Section **Auth** → `POST /api/auth/login`
2. "Try it out"
3. Body :
```json
{
  "email": "owner@smartproperty.com",
  "password": "Password123!"
}
```
4. "Execute"
5. **Copier** `tokens.accessToken` dans la réponse

---

### 4️⃣ S'Authentifier
1. Bouton **"Authorize"** (en haut à droite) 🔓
2. **Coller le token** (SANS "Bearer")
3. "Authorize" → "Close"
4. ✅ Cadenas fermé = Authentifié !

---

### 5️⃣ Créer une Propriété
1. Section **Properties** → `POST /api/properties`
2. "Try it out"
3. Body :
```json
{
  "title": "Test Appartement",
  "type": "apartment",
  "price": 1500,
  "address": {
    "street": "123 Rue de la Paix",
    "city": "Paris",
    "state": "Île-de-France",
    "zipCode": "75001",
    "country": "France"
  }
}
```
4. "Execute"
5. ✅ **Status : 201 Created** = Succès !

---

## ❌ ERREURS COURANTES

### Erreur 401
- ❌ Token pas collé dans "Authorize"
- ❌ Mot "Bearer" ajouté (ne PAS le mettre !)
- ❌ Token expiré → reconnectez-vous

### Erreur 403
- ❌ Compte TENANT utilisé → utilisez OWNER/ADMIN/MANAGER

---

## ✅ Ce qui a été Corrigé

**Fichier** : `backend/src/main.ts`

**Avant** : `.addBearerAuth({...}, 'JWT-auth')`
**Après** : `.addBearerAuth({...})` (nom par défaut)

➡️ Maintenant Swagger trouve correctement l'authentification !

---

## 📞 Comptes de Test

- **owner@smartproperty.com** / Password123! (OWNER) ✅
- **admin@smartproperty.com** / Password123! (ADMIN) ✅
- **manager@smartproperty.com** / Password123! (MANAGER) ✅
- **tenant@smartproperty.com** / Password123! (TENANT) ❌

---

**C'est tout ! Ça devrait marcher maintenant.** ��

