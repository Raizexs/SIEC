from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

try:
    from auth import CurrentUser, get_current_user
    from database import get_db
    from schemas_privacy import DeleteAccountConfirm, DeleteAccountRequest
    from services.account_deletion import (
        create_deletion_token,
        delete_supabase_auth_user,
        delete_user_data,
    )
    from services.data_export import build_user_export
    from observability import log
except ModuleNotFoundError:
    from backend.auth import CurrentUser, get_current_user  # type: ignore
    from backend.database import get_db  # type: ignore
    from backend.schemas_privacy import DeleteAccountConfirm, DeleteAccountRequest  # type: ignore
    from backend.services.account_deletion import (  # type: ignore
        create_deletion_token,
        delete_supabase_auth_user,
        delete_user_data,
    )
    from backend.services.data_export import build_user_export  # type: ignore
    from backend.observability import log  # type: ignore

router = APIRouter(prefix="/me", tags=["account"])


@router.get("/export")
def export_my_data(
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    return build_user_export(db, user.id, user.raw_claims)


@router.post("/delete-request")
def request_account_deletion(
    body: DeleteAccountRequest,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if body.confirmation.strip().upper() != "ELIMINAR":
        raise HTTPException(
            status_code=400,
            detail="Debe escribir ELIMINAR para confirmar la solicitud",
        )

    token = create_deletion_token(db, user.id)
    db.commit()

    log.info("account_deletion_requested", user_id=user.id)

    return {
        "message": (
            "Solicitud registrada. Use el token devuelto para confirmar la eliminación "
            "definitiva de su cuenta en las próximas 24 horas."
        ),
        "token": token,
        "email": user.email,
    }


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_account(
    token: str = Query(..., description="Token de confirmación de eliminación"),
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        delete_user_data(db, user.id, token=token)
        db.commit()
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        db.rollback()
        log.error("account_deletion_failed", user_id=user.id, error=str(exc))
        raise HTTPException(status_code=500, detail="Error al eliminar la cuenta") from exc

    await delete_supabase_auth_user(user.id)
    log.info("account_deleted", user_id=user.id)
    return None
