# 🖼️ Module Images de Propriétés - MinIO

## 📋 Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      Frontend                            │
│         (Upload images via multipart/form-data)          │
└───────────────────────┬──────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────┐
│                   NestJS Backend                         │
│  ┌─────────────────────┐  ┌─────────────────────────┐   │
│  │ PropertyImages      │  │ Upload Controller       │   │
│  │ Controller          │  │ (Generic uploads)       │   │
│  └──────────┬──────────┘  └───────────┬─────────────┘   │
│             │                         │                  │
│             ▼                         ▼                  │
│  ┌──────────────────────────────────────────────────┐   │
│  │              MinIO Service                        │   │
│  │  - Upload files to MinIO                          │   │
│  │  - Delete files                                   │   │
│  │  - Generate presigned URLs                        │   │
│  │  - List files                                     │   │
│  └───────────────────────┬──────────────────────────┘   │
└──────────────────────────┼──────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────┐
│                  MinIO (S3-Compatible)                   │
│  ┌─────────────────────────────────────────────────┐    │
│  │             Bucket: smartproperty                │    │
│  │  ├── properties/                                 │    │
│  │  │   ├── {propertyId}/                          │    │
│  │  │   │   ├── image1.jpg                         │    │
│  │  │   │   ├── image2.png                         │    │
│  │  │   │   └── ...                                │    │
│  │  ├── users/                                      │    │
│  │  │   └── {userId}/                              │    │
│  │  │       └── avatar.jpg                         │    │
│  │  └── documents/                                  │    │
│  └─────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                    MongoDB                               │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Collection: properties                          │    │
│  │  {                                               │    │
│  │    _id: ObjectId,                                │    │
│  │    title: "...",                                 │    │
│  │    images: [                                     │    │
│  │      {                                           │    │
│  │        url: "http://minio:9000/...",            │    │
│  │        key: "properties/{id}/image1.jpg",       │    │
│  │        caption: "Living room",                  │    │
│  │        isPrimary: true,                         │    │
│  │        order: 0                                 │    │
│  │      }                                           │    │
│  │    ]                                             │    │
│  │  }                                               │    │
│  └─────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

---

## 🚀 Démarrage

### 1. Démarrer MinIO

```bash
docker-compose up -d minio
```

### 2. Accéder à la Console MinIO

- **URL**: http://localhost:9001
- **Username**: `smartproperty_minio`
- **Password**: `smartproperty_minio_secret_2024`

### 3. Démarrer le Backend

```bash
cd backend
npm run start:dev
```

---

## 📡 API Endpoints

### Property Images

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/api/properties/:propertyId/images` | Upload images (multipart/form-data) |
| `GET` | `/api/properties/:propertyId/images` | Get all images for a property |
| `GET` | `/api/properties/:propertyId/images/primary` | Get primary image |
| `PATCH` | `/api/properties/:propertyId/images/primary` | Set primary image |
| `PATCH` | `/api/properties/:propertyId/images/:imageKey/caption` | Update image caption |
| `PATCH` | `/api/properties/:propertyId/images/reorder` | Reorder images |
| `DELETE` | `/api/properties/:propertyId/images/:imageKey` | Delete specific image |
| `DELETE` | `/api/properties/:propertyId/images` | Delete all images |

### Generic Upload

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/api/upload/property/:propertyId/images` | Upload multiple images |
| `POST` | `/api/upload/property/:propertyId/image` | Upload single image |
| `POST` | `/api/upload/user/avatar` | Upload user avatar |

---

## 📝 Exemples d'Utilisation

### 1. Upload d'Images (cURL)

```bash
# Login first
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@smartproperty.com","password":"Password123!"}' \
  | jq -r '.tokens.accessToken')

# Upload images
curl -X POST "http://localhost:3000/api/properties/{propertyId}/images" \
  -H "Authorization: Bearer $TOKEN" \
  -F "images=@/path/to/image1.jpg" \
  -F "images=@/path/to/image2.jpg"
```

### 2. Upload d'Images (JavaScript/Fetch)

```javascript
const formData = new FormData();
formData.append('images', file1);
formData.append('images', file2);

const response = await fetch(`/api/properties/${propertyId}/images`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
  body: formData,
});

const result = await response.json();
console.log(result.addedImages);
```

### 3. Upload d'Images (React)

```tsx
const PropertyImageUpload = ({ propertyId }: { propertyId: string }) => {
  const [uploading, setUploading] = useState(false);
  
  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    
    setUploading(true);
    
    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('images', file);
    });
    
    try {
      const response = await api.post(`/properties/${propertyId}/images`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('Uploaded:', response.data);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <input
      type="file"
      multiple
      accept="image/*"
      onChange={handleUpload}
      disabled={uploading}
    />
  );
};
```

### 4. Récupérer les Images

```javascript
const response = await fetch(`/api/properties/${propertyId}/images`);
const images = await response.json();

// images = [
//   {
//     url: "http://localhost:9000/smartproperty/properties/123/image1.jpg",
//     key: "properties/123/image1.jpg",
//     caption: "Living room",
//     isPrimary: true,
//     order: 0
//   },
//   ...
// ]
```

### 5. Définir l'Image Principale

```javascript
await fetch(`/api/properties/${propertyId}/images/primary`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    imageKey: 'properties/123/image2.jpg',
  }),
});
```

### 6. Supprimer une Image

```javascript
const imageKey = encodeURIComponent('properties/123/image1.jpg');
await fetch(`/api/properties/${propertyId}/images/${imageKey}`, {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});
```

---

## 🔐 Autorisations

| Rôle | Upload | View | Delete | Manage |
|------|--------|------|--------|--------|
| ADMIN | ✅ | ✅ | ✅ | ✅ |
| OWNER | ✅ (ses propriétés) | ✅ | ✅ | ✅ |
| MANAGER | ✅ (propriétés assignées) | ✅ | ✅ | ✅ |
| AGENT | ✅ | ✅ | ❌ | ❌ |
| TENANT | ❌ | ✅ | ❌ | ❌ |

---

## ⚙️ Configuration

### Variables d'Environnement

```env
# MinIO Configuration
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=smartproperty_minio
MINIO_SECRET_KEY=smartproperty_minio_secret_2024
MINIO_BUCKET_NAME=smartproperty
MINIO_PUBLIC_URL=http://localhost:9000
```

### Limites

| Paramètre | Valeur |
|-----------|--------|
| Taille max par fichier | 10 MB |
| Nombre max de fichiers par requête | 20 |
| Types d'images acceptés | JPEG, PNG, WebP, GIF |

---

## 🗄️ Structure MongoDB

### Property Entity

```typescript
interface Property {
  _id: ObjectId;
  title: string;
  // ... autres champs
  images?: Array<{
    url: string;          // URL publique MinIO
    key?: string;         // Clé de stockage MinIO
    caption?: string;     // Description de l'image
    isPrimary?: boolean;  // Image principale
    order?: number;       // Ordre d'affichage
    uploadedAt?: Date;    // Date d'upload
  }>;
}
```

---

## 📁 Fichiers Créés

```
backend/src/
├── config/
│   └── minio.config.ts         # Configuration MinIO
├── modules/
│   ├── upload/
│   │   ├── index.ts
│   │   ├── minio.service.ts    # Service MinIO
│   │   ├── upload.controller.ts # Controller uploads génériques
│   │   └── upload.module.ts
│   └── properties/
│       ├── property-images.controller.ts  # Controller images propriétés
│       └── property-images.service.ts     # Service images propriétés
```

---

## 🐳 Docker

MinIO est ajouté au `docker-compose.yml`:

```yaml
minio:
  image: minio/minio:latest
  container_name: smartproperty-minio
  command: server /data --console-address ":9001"
  environment:
    MINIO_ROOT_USER: smartproperty_minio
    MINIO_ROOT_PASSWORD: smartproperty_minio_secret_2024
  ports:
    - "9000:9000"   # API
    - "9001:9001"   # Console Web
  volumes:
    - minio_data:/data
```

---

## 🔍 Test dans Swagger

1. **Ouvrir Swagger**: http://localhost:3000/api/docs
2. **S'authentifier** avec `owner@smartproperty.com`
3. **Aller à la section** "Property Images"
4. **Tester** `POST /api/properties/{propertyId}/images`
5. **Uploader** des images via le formulaire

---

## 🎯 Résumé

✅ **MinIO** : Stockage d'objets S3-compatible  
✅ **MongoDB** : Métadonnées des images (URL, caption, ordre)  
✅ **API REST** : Endpoints pour upload, gestion, suppression  
✅ **Autorisations** : Basées sur les rôles (RBAC)  
✅ **Swagger** : Documentation automatique  

---

**Date de création**: 14 février 2026  
**Version**: 1.0.0

