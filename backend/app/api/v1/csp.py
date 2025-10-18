"""
CSP Violation Reporting API
Handles Content Security Policy violation reports from browsers
"""

import logging
from datetime import datetime
from typing import Any, Dict, Optional

from fastapi import APIRouter, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.core.logging import log_security_event

logger = logging.getLogger(__name__)

router = APIRouter()


class CSPViolationReport(BaseModel):
    """CSP violation report structure"""
    document_uri: str = Field(..., description="The URI of the document in which the violation occurred")
    violated_directive: str = Field(..., description="The directive whose enforcement caused the violation")
    effective_directive: str = Field(..., description="The directive whose enforcement caused the violation")
    original_policy: str = Field(..., description="The original policy as specified by the Content-Security-Policy HTTP header")
    blocked_uri: str = Field("", description="The URI of the resource that was blocked from loading")
    status_code: int = Field(0, description="The status code of the HTTP response that contained the blocked resource")
    source_file: Optional[str] = Field(None, description="The URI of the document or worker in which the violation occurred")
    line_number: Optional[int] = Field(None, description="The line number in source-file on which the violation occurred")
    column_number: Optional[int] = Field(None, description="The column number in source-file on which the violation occurred")


@router.post("/csp-report", status_code=status.HTTP_204_NO_CONTENT)
async def report_csp_violation(
    request: Request,
    csp_report: Dict[str, Any]
) -> None:
    """
    Receive and log CSP violation reports from browsers

    Browsers send CSP violation reports as JSON in the request body with
    a "csp-report" key containing the violation details.
    """
    try:
        # Extract the CSP report from the request
        report_data = csp_report.get("csp-report", {})

        # Validate and parse the report
        violation = CSPViolationReport(**report_data)

        # Get client information
        client_ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else "unknown")
        user_agent = request.headers.get("User-Agent", "")

        # Log the CSP violation as a security event
        log_security_event(
            "CSP_VIOLATION",
            None,  # No user context for CSP reports
            request,
            severity="MEDIUM",
            details={
                "document_uri": violation.document_uri,
                "violated_directive": violation.violated_directive,
                "effective_directive": violation.effective_directive,
                "blocked_uri": violation.blocked_uri,
                "status_code": violation.status_code,
                "source_file": violation.source_file,
                "line_number": violation.line_number,
                "column_number": violation.column_number,
                "original_policy": violation.original_policy,
                "client_ip": client_ip,
                "user_agent": user_agent,
                "timestamp": datetime.utcnow().isoformat(),
            }
        )

        # Log additional details for monitoring
        logger.warning(
            f"CSP Violation: {violation.violated_directive} blocked {violation.blocked_uri} "
            f"on {violation.document_uri}",
            extra={
                "csp_violation": {
                    "directive": violation.violated_directive,
                    "blocked_uri": violation.blocked_uri,
                    "document_uri": violation.document_uri,
                    "client_ip": client_ip,
                    "user_agent": user_agent,
                }
            }
        )

        # Return 204 No Content (standard for CSP reporting endpoints)
        return

    except Exception as e:
        # Log parsing errors but don't expose them to prevent information leakage
        logger.error(f"Error processing CSP violation report: {e}")
        return


@router.get("/csp-status")
async def get_csp_status():
    """
    Get CSP configuration status and current policy

    This endpoint can be used to check the current CSP configuration
    and verify that the system is working correctly.
    """
    from app.core.csp_config import get_csp_header, get_csp_directives

    return {
        "status": "active",
        "csp_header": get_csp_header(),
        "directives": get_csp_directives(),
        "report_uri": "/api/v1/csp/csp-report",
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.options("/csp-report")
async def csp_report_options():
    """
    Handle OPTIONS requests for CSP reporting endpoint

    This ensures CORS compatibility for CSP violation reports.
    """
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        }
    )