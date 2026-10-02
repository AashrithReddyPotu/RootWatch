from fastapi import APIRouter, HTTPException, Request, status

from app.investigation import Investigator
from app.llm.client import LLMError
from app.models import ChatRequest, ChatResponse, ErrorDetail, ErrorResponse
from app.providers.base import IncidentNotFoundError, IncidentProviderError


router = APIRouter(tags=["investigation"])


@router.post(
    "/chat",
    response_model=ChatResponse,
    responses={
        404: {"model": ErrorResponse},
        502: {"model": ErrorResponse},
        503: {"model": ErrorResponse},
    },
)
async def chat(payload: ChatRequest, request: Request) -> ChatResponse:
    investigator: Investigator = request.app.state.investigator
    try:
        return await investigator.investigate(payload)
    except IncidentNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorDetail(code="INCIDENT_NOT_FOUND", message=str(exc)).model_dump(),
        ) from exc
    except IncidentProviderError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=ErrorDetail(code="INCIDENT_PROVIDER_ERROR", message=str(exc)).model_dump(),
        ) from exc
    except LLMError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=ErrorDetail(code="MODEL_UNAVAILABLE", message=str(exc)).model_dump(),
        ) from exc
