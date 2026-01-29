# SmartProperty AI Services

AI-powered features for the SmartProperty platform built with FastAPI and Python.

## Features

- 🏠 **Property Recommendations** - ML-based property matching using collaborative and content-based filtering
- 💰 **Price Prediction** - Rental price estimation based on property features and market data
- 🖼️ **Image Analysis** - Property image classification, quality scoring, and auto-tagging
- 🔍 **Smart Search** - NLP-powered natural language search
- 📊 **Market Analytics** - Trends, neighborhood rankings, and investment analysis

## Tech Stack

- **Framework**: FastAPI 0.109
- **Language**: Python 3.11+
- **Database**: MongoDB (shared with backend)
- **Cache**: Redis (shared with backend)
- **ML Libraries**: scikit-learn, pandas, numpy
- **Image Processing**: Pillow, OpenCV (optional)
- **NLP**: spaCy, NLTK (optional)

## Project Structure

```
ai-services/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── endpoints/
│   │       │   ├── recommendations.py   # Property recommendations
│   │       │   ├── pricing.py           # Price prediction
│   │       │   ├── image_analysis.py    # Image classification
│   │       │   ├── search.py            # Smart search
│   │       │   └── analytics.py         # Market analytics
│   │       └── router.py
│   ├── core/
│   │   ├── config.py                    # Settings
│   │   ├── database.py                  # MongoDB connection
│   │   └── redis.py                     # Redis connection
│   ├── models/                          # Pydantic models
│   ├── services/                        # Business logic
│   │   ├── recommendation_service.py
│   │   ├── pricing_service.py
│   │   ├── image_service.py
│   │   ├── search_service.py
│   │   └── analytics_service.py
│   ├── ml/                              # Machine learning
│   │   ├── recommendation/
│   │   ├── pricing/
│   │   └── image/
│   └── main.py                          # FastAPI app
├── models/                              # Trained ML models
│   ├── recommendation/
│   ├── pricing/
│   └── image_analysis/
├── tests/
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## Getting Started

### Prerequisites

- Python 3.11 or higher
- pip or pipenv
- Docker (optional, for containerized deployment)

### Installation

1. **Create virtual environment:**

```bash
cd ai-services
python -m venv venv

# Windows
.\venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

2. **Install dependencies:**

```bash
pip install -r requirements.txt
```

3. **Set up environment variables:**

```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Run the application:**

```bash
# Development mode with auto-reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Or using Python directly
python -m app.main
```

### Using Docker

```bash
# Build and run
docker-compose up --build

# Run in background
docker-compose up -d
```

## API Documentation

Once running, access the API documentation at:

- **Swagger UI**: http://localhost:8000/api/v1/docs
- **ReDoc**: http://localhost:8000/api/v1/redoc
- **OpenAPI JSON**: http://localhost:8000/api/v1/openapi.json

## API Endpoints

### Recommendations

| Method | Endpoint                                 | Description                        |
| ------ | ---------------------------------------- | ---------------------------------- |
| GET    | `/api/v1/recommendations/user/{user_id}` | Get personalized recommendations   |
| POST   | `/api/v1/recommendations/preferences`    | Get recommendations by preferences |
| POST   | `/api/v1/recommendations/similar`        | Find similar properties            |

### Price Prediction

| Method | Endpoint                        | Description           |
| ------ | ------------------------------- | --------------------- |
| POST   | `/api/v1/pricing/predict`       | Predict rental price  |
| POST   | `/api/v1/pricing/bulk-predict`  | Bulk price prediction |
| GET    | `/api/v1/pricing/market/{city}` | Get market analysis   |

### Image Analysis

| Method | Endpoint                       | Description            |
| ------ | ------------------------------ | ---------------------- |
| POST   | `/api/v1/images/analyze`       | Analyze property image |
| POST   | `/api/v1/images/batch-analyze` | Batch image analysis   |
| POST   | `/api/v1/images/quality-check` | Check image quality    |

### Smart Search

| Method | Endpoint                      | Description             |
| ------ | ----------------------------- | ----------------------- |
| POST   | `/api/v1/search/`             | Natural language search |
| POST   | `/api/v1/search/parse`        | Parse search query      |
| GET    | `/api/v1/search/autocomplete` | Search autocomplete     |

### Market Analytics

| Method | Endpoint                            | Description         |
| ------ | ----------------------------------- | ------------------- |
| GET    | `/api/v1/analytics/overview/{city}` | Market overview     |
| GET    | `/api/v1/analytics/trends/{city}`   | Price trends        |
| POST   | `/api/v1/analytics/investment`      | Investment analysis |

## Development

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app

# Run specific test file
pytest tests/test_recommendations.py
```

### Code Quality

```bash
# Format code
black app/

# Sort imports
isort app/

# Lint
flake8 app/

# Type checking
mypy app/
```

## Environment Variables

| Variable      | Description                          | Default     |
| ------------- | ------------------------------------ | ----------- |
| `APP_ENV`     | Environment (development/production) | development |
| `DEBUG`       | Debug mode                           | true        |
| `PORT`        | API port                             | 8000        |
| `MONGODB_URI` | MongoDB connection string            | -           |
| `REDIS_HOST`  | Redis host                           | localhost   |
| `REDIS_PORT`  | Redis port                           | 6379        |
| `JWT_SECRET`  | JWT secret for auth                  | -           |
| `MODEL_PATH`  | Path to ML models                    | ./models    |

## Integration with Backend

The AI services integrate with the NestJS backend via:

1. **Shared MongoDB**: Same database for property data
2. **Shared Redis**: Same cache for session data
3. **REST API**: Backend calls AI endpoints for predictions
4. **JWT Validation**: Same JWT secrets for authentication

## ML Model Training

To train or update models:

```bash
# Train recommendation model
python -m app.ml.recommendation.train

# Train pricing model
python -m app.ml.pricing.train

# Train image classifier
python -m app.ml.image.train
```

## License

MIT
