# Agentic AI API Testing Platform

An intelligent, AI-powered platform that automates API testing by analyzing developer documentation, client requirements, and human tester insights to generate, execute, and report on comprehensive test cases.

## Features

- 🤖 **AI-Powered Analysis**: Parallel analysis of developer docs, client requirements, and tester instructions
- 🧪 **Intelligent Test Generation**: Automatic generation of comprehensive test cases (happy path, negative, boundary, security, etc.)
- ✏️ **Human-in-the-Loop**: Artifact-style test case review and editing interface
- ⚡ **Parallel Execution**: Dynamic test execution with configurable concurrency
- 📊 **Rich Reporting**: Interactive dashboards and exportable reports (PDF, HTML, JSON)
- 🔐 **Multi-Auth Support**: API Key, Bearer Token, Basic Auth, OAuth (coming soon)

## Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL 15+
- **ORM**: SQLAlchemy
- **AI**: Google ADK (Agentic Development Kit)
- **Authentication**: JWT with bcrypt

### Frontend
- **Framework**: React 18+ with Vite
- **State Management**: Redux Toolkit
- **UI Library**: Material-UI (MUI)
- **Code Editor**: Monaco Editor
- **Charts**: Recharts
- **Markdown**: react-markdown

## Project Structure

```
Agentic API Testing/
├── backend/                    # FastAPI backend
│   ├── agents/                # Google ADK agents
│   ├── alembic/               # Database migrations
│   ├── api/                   # API route handlers
│   ├── database/              # Models and schemas
│   ├── services/              # Business logic services
│   ├── tests/                 # Backend tests
│   ├── main.py                # FastAPI app entry point
│   ├── config.py              # Configuration
│   └── dependencies.py        # Dependency injection
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── api/              # API client
│   │   ├── components/       # React components
│   │   ├── pages/            # Page components
│   │   ├── store/            # Redux store & slices
│   │   ├── App.jsx           # Main app component
│   │   └── main.jsx          # Entry point
│   ├── package.json
│   └── vite.config.js
├── uploads/                    # Uploaded files (gitignored)
├── docker-compose.yml         # Local development services
├── .env.example               # Environment variables template
├── .gitignore
└── README.md
```

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 15+
- Google ADK API access

### Backend Setup

1. **Create virtual environment:**
   ```bash
   cd backend
   python -m venv venv
   venv\Scripts\activate  # Windows
   # source venv/bin/activate  # Linux/Mac
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment:**
   ```bash
   cp ../.env.example ../.env
   # Edit .env with your database credentials and API keys
   ```

4. **Start PostgreSQL:**
   ```bash
   docker-compose up -d postgres
   ```

5. **Run migrations:**
   ```bash
   alembic upgrade head
   ```

6. **Start backend:**
   ```bash
   uvicorn main:app --reload --port 8000
   ```

   Backend will be available at: `http://localhost:8000`
   API docs at: `http://localhost:8000/docs`

### Frontend Setup

1. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

   Frontend will be available at: `http://localhost:5173`

## Development Workflow

1. **Create new feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Backend development:**
   - Add/modify models in `backend/database/models.py`
   - Create migration: `alembic revision --autogenerate -m "description"`
   - Run migration: `alembic upgrade head`
   - Add API routes in `backend/api/`
   - Add business logic in `backend/services/`
   - Write tests in `backend/tests/`

3. **Frontend development:**
   - Add components in `frontend/src/components/`
   - Add pages in `frontend/src/pages/`
   - Add Redux slices in `frontend/src/store/slices/`
   - Update API client in `frontend/src/api/`

4. **Run tests:**
   ```bash
   # Backend
   cd backend
   pytest

   # Frontend
   cd frontend
   npm test
   ```

5. **Commit and push:**
   ```bash
   git add .
   git commit -m "feat: your feature description"
   git push origin feature/your-feature-name
   ```

## API Documentation

Once the backend is running, visit `http://localhost:8000/docs` for interactive API documentation (Swagger UI).

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost/dbname` |
| `JWT_SECRET` | Secret key for JWT tokens | `your-secret-key-here` |
| `JWT_ALGORITHM` | JWT algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token expiry time | `1440` (24 hours) |
| `GOOGLE_ADK_API_KEY` | Google ADK API key | `your-adk-key` |
| `FILE_STORAGE_PATH` | Path for uploaded files | `./uploads` |
| `CORS_ORIGINS` | Allowed CORS origins | `http://localhost:5173,http://localhost:3000` |

## Phase 1 MVP Milestones

- [ ] Backend API with all endpoints
- [ ] Google ADK agent integration
- [ ] Frontend with artifact-style test viewer
- [ ] End-to-end user journey working
- [ ] Test execution for JSON APIs
- [ ] Report generation (HTML, JSON)
- [ ] Documentation complete

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

[Your License Here]

## Support

For issues and questions, please open a GitHub issue or contact the development team.
