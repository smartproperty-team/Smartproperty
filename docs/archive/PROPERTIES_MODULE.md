# 🏠 Module Frontend Propriétés - SmartProperty

## 📋 Vue d'Ensemble

Ce module fournit une interface utilisateur complète pour la gestion des propriétés immobilières, incluant :
- Liste des propriétés avec filtres
- Détails d'une propriété
- Création et modification de propriétés
- Upload et gestion d'images

---

## 📁 Structure des Fichiers

```
frontend/src/
├── types/
│   └── property.ts              # Types TypeScript pour les propriétés
├── services/
│   └── property.service.ts      # Service API pour les propriétés
├── pages/
│   └── properties/
│       ├── index.ts             # Exports du module
│       ├── properties.css       # Styles CSS
│       ├── PropertiesPage.tsx   # Page liste des propriétés
│       ├── PropertyDetailPage.tsx   # Page détail d'une propriété
│       └── PropertyFormPage.tsx # Page création/modification
└── App.tsx                      # Routes mises à jour
```

---

## 🔗 Routes

| Route | Page | Description | Auth Required |
|-------|------|-------------|---------------|
| `/properties` | PropertiesPage | Liste des propriétés | Non |
| `/properties/:id` | PropertyDetailPage | Détails d'une propriété | Non |
| `/properties/new` | PropertyFormPage | Créer une propriété | ✅ Oui |
| `/properties/:id/edit` | PropertyFormPage | Modifier une propriété | ✅ Oui |

---

## 📸 Screenshots

### Page Liste des Propriétés
- Grille responsive de cartes
- Filtres par type, statut, ville
- Recherche par mots-clés
- Pagination

### Page Détail
- Galerie d'images
- Caractéristiques (chambres, SdB, surface)
- Description complète
- Informations du propriétaire
- Actions (modifier, supprimer)

### Page Formulaire
- Sections organisées (info, adresse, caractéristiques, images)
- Validation en temps réel
- Upload d'images par drag & drop
- Preview des images

---

## 🛠️ Utilisation

### 1. Lister les Propriétés

La page `/properties` affiche toutes les propriétés avec des filtres :

```typescript
// Les filtres disponibles
interface PropertyFilters {
  page?: number;
  limit?: number;
  type?: PropertyType;      // apartment, house, villa, studio, condo, land
  status?: PropertyStatus;  // available, rented, maintenance, unlisted
  city?: string;
  search?: string;
}
```

### 2. Créer une Propriété

1. Connectez-vous à l'application
2. Allez sur `/properties/new`
3. Remplissez le formulaire :
   - **Titre** (requis)
   - **Prix** (requis)
   - **Type** (appartement, maison, etc.)
   - **Adresse** (rue, ville, pays requis)
   - **Caractéristiques** (optionnel)
   - **Images** (optionnel)
4. Cliquez sur "Créer la propriété"

### 3. Modifier une Propriété

1. Allez sur `/properties/:id/edit`
2. Modifiez les champs souhaités
3. Cliquez sur "Mettre à jour"

### 4. Gérer les Images

```typescript
// Upload d'images
await propertyService.uploadImages(propertyId, files);

// Définir l'image principale
await propertyService.setPrimaryImage(propertyId, imageKey);

// Supprimer une image
await propertyService.deleteImage(propertyId, imageKey);
```

---

## 🎨 Design System

### Couleurs (Variables CSS)

```css
--color-primary: #3b82f6;       /* Bleu principal */
--color-primary-dark: #2563eb;  /* Bleu foncé (hover) */
--color-secondary: #1e293b;     /* Texte principal */
--color-text-muted: #64748b;    /* Texte secondaire */
--color-border: #e2e8f0;        /* Bordures */
--color-background-alt: #f8fafc; /* Arrière-plan alternatif */
```

### Composants

| Composant | Description |
|-----------|-------------|
| `.property-card` | Carte de propriété dans la grille |
| `.property-badge` | Badge de statut (disponible, loué...) |
| `.property-type-badge` | Badge de type (appartement, maison...) |
| `.btn-filter` | Boutons de filtres |
| `.btn-view`, `.btn-edit`, `.btn-delete` | Boutons d'action |
| `.image-upload-zone` | Zone de drop pour images |

### Responsive

- **Mobile** (< 768px) : Grille 1 colonne
- **Tablet** (768px - 1024px) : Grille 2 colonnes
- **Desktop** (> 1024px) : Grille 3-4 colonnes

---

## 📡 API Service

```typescript
import { propertyService } from '@/services/property.service';

// CRUD
const properties = await propertyService.getProperties(filters);
const property = await propertyService.getProperty(id);
const newProperty = await propertyService.createProperty(data);
const updatedProperty = await propertyService.updateProperty(id, data);
await propertyService.deleteProperty(id);

// Images
await propertyService.uploadImages(propertyId, files);
await propertyService.getImages(propertyId);
await propertyService.setPrimaryImage(propertyId, imageKey);
await propertyService.deleteImage(propertyId, imageKey);
await propertyService.deleteAllImages(propertyId);
```

---

## 🔐 Sécurité

- Les routes de création/modification nécessitent une authentification
- Le composant `<ProtectedRoute>` redirige vers `/login` si non connecté
- Le token JWT est automatiquement ajouté aux requêtes via l'intercepteur axios

---

## ⚙️ Configuration

### Variables d'Environnement

```env
VITE_API_URL=http://localhost:3000/api
```

### Proxy Vite (vite.config.ts)

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
    },
  },
}
```

---

## 🧪 Test

### Démarrage

```bash
# Backend
cd backend && npm run start:dev

# MinIO (pour les images)
docker-compose up -d minio

# Frontend
cd frontend && npm run dev
```

### Accès

- **Frontend** : http://localhost:5173
- **Swagger API** : http://localhost:3000/api/docs
- **MinIO Console** : http://localhost:9001

### Comptes de Test

| Email | Password | Rôle |
|-------|----------|------|
| admin@smartproperty.com | Password123! | ADMIN |
| owner@smartproperty.com | Password123! | OWNER |
| manager@smartproperty.com | Password123! | MANAGER |

---

## 📝 Types TypeScript

```typescript
// Types de propriété
type PropertyType = 'apartment' | 'house' | 'condo' | 'studio' | 'villa' | 'land';
type PropertyStatus = 'available' | 'rented' | 'maintenance' | 'unlisted';

// Interface Property
interface Property {
  _id: string;
  title: string;
  description?: string;
  type: PropertyType;
  status: PropertyStatus;
  price: number;
  currency: string;
  address: PropertyAddress;
  features?: PropertyFeatures;
  images?: PropertyImage[];
  ownerId: string;
  managerId?: string;
  createdAt: string;
  updatedAt: string;
}

// Interface Image
interface PropertyImage {
  url: string;
  key?: string;
  caption?: string;
  isPrimary?: boolean;
  order?: number;
}
```

---

## 🚀 Prochaines Étapes

- [ ] Ajout de la carte (map) pour localisation
- [ ] Recherche avancée avec plus de filtres
- [ ] Favoris / Wishlist
- [ ] Comparaison de propriétés
- [ ] Visite virtuelle 360°
- [ ] Notifications en temps réel

---

**Date de création** : 14 février 2026  
**Version** : 1.0.0

