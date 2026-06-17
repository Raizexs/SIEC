from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


CONSENT_TYPES = frozenset({
    "privacy_policy",
    "terms",
    "siecplace_publish",
    "siecplace_contact_share",
    "public_share",
})

REVOKEABLE_CONSENTS = frozenset({
    "siecplace_publish",
    "siecplace_contact_share",
    "public_share",
})


class PrivacyPolicyOut(BaseModel):
    id: str
    version: str
    published_at: datetime
    url_path: str
    summary: Optional[str] = None


class ConsentCreate(BaseModel):
    consent_type: str = Field(..., description="Tipo de consentimiento")
    policy_version: str = Field(..., description="Versión de política aceptada")
    granted: bool = True
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ConsentOut(BaseModel):
    id: UUID
    consent_type: str
    policy_version: str
    granted: bool
    granted_at: datetime
    revoked_at: Optional[datetime] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="before")
    @classmethod
    def _map_consent_metadata(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "extra" in data and "metadata" not in data:
                data = {**data, "metadata": data.get("extra") or {}}
            return data
        extra = getattr(data, "extra", None)
        if extra is None:
            return data
        return {
            "id": data.id,
            "consent_type": data.consent_type,
            "policy_version": data.policy_version,
            "granted": data.granted,
            "granted_at": data.granted_at,
            "revoked_at": data.revoked_at,
            "metadata": extra or {},
        }

    class Config:
        from_attributes = True


class ConsentRevoke(BaseModel):
    consent_type: str


class ConsentStatusOut(BaseModel):
    consent_type: str
    has_active_consent: bool
    policy_version: Optional[str] = None
    granted_at: Optional[datetime] = None


class DeleteAccountRequest(BaseModel):
    confirmation: str = Field(..., description="Debe ser 'ELIMINAR'")


class DeleteAccountConfirm(BaseModel):
    token: str


class DataExportMeta(BaseModel):
    schema_version: str = "1.0"
    generated_at: datetime
    user_id: str
    readme: str
