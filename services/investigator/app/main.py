from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.chat import router as chat_router
from app.config import Settings, get_settings
from app.investigation import Investigator
from app.models import HealthResponse
from app.providers import create_incident_provider


def create_app(settings: Settings | None = None) -> FastAPI:
    app_settings = settings or get_settings()
    provider = create_incident_provider(app_settings)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.investigator = Investigator(app_settings, provider)
        yield
        await provider.close()

    app = FastAPI(
        title=app_settings.app_name,
        version="0.1.0",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=app_settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Request validation failed",
                    "details": {"errors": exc.errors()},
                }
            },
        )

    @app.exception_handler(HTTPException)
    async def http_error_handler(request: Request, exc: HTTPException):
        detail = exc.detail if isinstance(exc.detail, dict) else {
            "code": "HTTP_ERROR",
            "message": str(exc.detail),
            "details": None,
        }
        return JSONResponse(status_code=exc.status_code, content={"error": detail})

    @app.exception_handler(Exception)
    async def unexpected_error_handler(request: Request, exc: Exception):
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "The investigation service encountered an unexpected error",
                    "details": None,
                }
            },
        )

    @app.get("/health", response_model=HealthResponse, tags=["system"])
    async def health() -> HealthResponse:
        return HealthResponse(
            status="ok",
            service=app_settings.app_name,
            incident_provider=app_settings.incident_provider,
            llm_enabled=app_settings.use_llm,
        )

    @app.get("/api/v1/health", response_model=HealthResponse, include_in_schema=False)
    async def versioned_health() -> HealthResponse:
        return await health()

    app.include_router(chat_router, prefix="/api/v1")
    return app


app = create_app()
